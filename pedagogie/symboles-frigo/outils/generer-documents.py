# -*- coding: utf-8 -*-
"""Génère les documents imprimables A4 : interrogation.html, carnet-eleve.html
et memo-frigoriste.html.

Le tirage est FIXE (pas d'aléatoire) : le sujet doit être identique d'une
impression à l'autre et le corrigé doit lui correspondre exactement.

    python3 outils/generer-documents.py
"""
import io, json, os, re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

brut = io.open(os.path.join(RACINE, 'donnees-symboles.js'), encoding='utf-8').read()
D = json.loads(brut[brut.index('{'):brut.rindex('}') + 1])
SYM = {s['id']: s for s in D['symboles']}


def svg(sid, cote=90):
    """Symbole à taille fixe, avec le marquage CD / EV s'il y en a un."""
    s = SYM[sid]
    t = s['svg']
    if s.get('marque'):
        t = t.replace('</svg>',
                      '<rect x="-11" y="15" width="22" height="13" fill="#fff"/>'
                      '<text x="0" y="25.5" text-anchor="middle" font-family="Arial" '
                      'font-size="11" font-weight="700">%s</text></svg>' % s['marque'])
    return t.replace('<svg ', '<svg width="%d" height="%d" ' % (cote, cote))


# ---------------------------------------------------------------- exercice 1
EX1 = [
    ('compresseur_centrifuge', 'R1',
     "Machine tournante (le cercle) ; c'est un compresseur centrifuge, "
     "la roue et son moyeu sont dessinés à l'intérieur."),
    ('tour_refroidissement_fermee', 'R2',
     "Tour de refroidissement fermée : trapèze + ventilateur + douchette, "
     "et un serpentin qui isole l'eau du circuit de l'air."),
    ('bulle_TZ', 'R6',
     "Instrument. T = température, Z = sécurité : thermostat de sécurité, il coupe."),
    ('regulateur_kvc', 'R8',
     "Vanne de régulation. Le pointillé est une liaison d'information : "
     "RC = régulation de capacité (KVC)."),
]

# ---------------------------------------------------------------- exercice 2
EX2 = ['compresseur_scroll', 'condenseur_a_air', 'detendeur_thermostatique',
       'filtre_deshydrateur', 'voyant_liquide', 'electrovanne',
       'separateur_huile', 'bouteille_liquide', 'bulle_PZH', 'regulateur_kvp']

# ---------------------------------------------------------------- exercice 3
EX3 = [
    ('filtre_huile', 'filtre_deshydrateur',
     "Croix en traits pleins = filtre à huile. Croix en pointillés = filtre déshydrateur."),
    ('voyant_liquide', 'voyant_huile',
     "Hublot vide = voyant liquide. Hublot avec un point au centre = voyant huile."),
    ('separateur_huile', 'bouteille_anticoup',
     "Le séparateur d'huile a un flotteur dessiné dedans, et se monte au refoulement. "
     "La bouteille anti-coup n'en a pas, et se monte sur l'aspiration."),
    ('bulle_PZH', 'bulle_PSH',
     "Z = sécurité : PZH coupe l'installation. S = commutation : PSH régule."),
    ('tour_refroidissement_ouverte', 'tour_refroidissement_fermee',
     "La tour fermée porte un serpentin : l'eau du circuit ne touche jamais l'air."),
]

# ---------------------------------------------------------------- exercice 4
# Huit repères du schéma sont effacés et remplacés par une lettre.
A_TROUVER = [(10, 'A'), (15, 'B'), (12, 'C'), (6, 'D'),
             (19, 'E'), (3, 'F'), (9, 'G'), (18, 'H')]

# ---------------------------------------------------------------- exercice 5
EX5 = [
    ("Du compresseur (1) vers le condenseur (10)", "Gaz haute pression, haute température"),
    ("Du condenseur (10) vers le détendeur (15)", "Liquide haute pression"),
    ("Du détendeur (15) vers l'évaporateur (17)", "Liquide basse pression"),
    ("De l'évaporateur (17) vers le compresseur (1)", "Gaz basse pression"),
]

# --------------------------------------------------------------------- schéma
POS = {17: (200, 130), 15: (370, 130), 14: (480, 130), 13: (580, 130),
       12: (680, 130), 11: (790, 130), 10: (930, 130),
       16: (480, 18), 22: (930, 18), 18: (80, 260), 19: (80, 390),
       4: (250, 452), 1: (390, 540), 3: (390, 430), 2: (500, 540),
       5: (600, 540), 6: (710, 540), 7: (860, 650), 8: (700, 715),
       9: (590, 715), 21: (470, 715), 20: (350, 715)}

TUYAUX = [
    ([(200, 130), (930, 130)], 0), ([(710, 540), (990, 540), (990, 130), (930, 130)], 0),
    ([(390, 540), (710, 540)], 0), ([(200, 130), (80, 130), (80, 540), (390, 540)], 0),
    ([(250, 540), (250, 496)], 0), ([(390, 500), (390, 474)], 0),
    ([(710, 584), (710, 650), (860, 650)], 0), ([(860, 694), (860, 715), (700, 715)], 0),
    ([(700, 715), (350, 715)], 0), ([(350, 715), (350, 590), (390, 590)], 0),
    ([(930, 62), (930, 86)], 1), ([(480, 62), (480, 86)], 1),
]

COTE, MASQUE = 88, 76


def schema(masquer):
    """masquer : {repère: lettre}. Les autres repères sont dessinés."""
    o = ['<svg viewBox="0 -46 1060 836" class="schema">']
    for pts, info in TUYAUX:
        o.append('<polyline class="tuyau%s" points="%s"/>'
                 % (' info' if info else '', ' '.join('%d,%d' % p for p in pts)))
    for r in D['schema']:
        n = r['n']
        x, y = POS[n]
        o.append('<rect x="%g" y="%g" width="%d" height="%d" fill="#fff"/>'
                 % (x - MASQUE / 2, y - MASQUE / 2, MASQUE, MASQUE))
        if n in masquer:
            o.append('<rect class="trou" x="%g" y="%g" width="%d" height="%d" rx="7"/>'
                     % (x - COTE / 2, y - COTE / 2, COTE, COTE))
            o.append('<text class="lettre" x="%g" y="%g" text-anchor="middle">%s</text>'
                     % (x, y + 11, masquer[n]))
        else:
            o.append(svg(r['id']).replace(
                '<svg ', '<svg x="%g" y="%g" width="%d" height="%d" '
                         % (x - (COTE - 10) / 2, y - (COTE - 10) / 2, COTE - 10, COTE - 10)))
        o.append('<text class="num" x="%g" y="%g">%d</text>'
                 % (x - COTE / 2 + 3, y - COTE / 2 - 5, n))
    o.append('</svg>')
    return ''.join(o)


# ---------------------------------------------------------------------- rendu
CSS = """
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Calibri,Carlito,'Segoe UI',sans-serif;font-size:14pt;line-height:1.5;
     color:#1b3a63;background:#fff;text-align:left;max-width:19cm;margin:0 auto;padding:14px}
h1,h2,h3{font-family:'Trebuchet MS',Tahoma,sans-serif;font-weight:700;line-height:1.25}
h1{font-size:19pt}
h2{font-size:15pt;margin:22px 0 10px;padding:6px 10px;background:#1b3a63;color:#fff;border-radius:6px}
h3{font-size:13pt;margin:14px 0 6px}
.bandeau{display:flex;align-items:center;gap:10px;border-bottom:3px solid #1b3a63;padding-bottom:8px;margin-bottom:12px}
.edu{background:#ff6b35;color:#fff;font-size:10pt;padding:2px 9px;border-radius:4px;font-weight:700;
     font-family:'Trebuchet MS',sans-serif}
.sign{margin-left:auto;font-size:10pt;color:#5a6472}
.identite{border:2px solid #1b3a63;border-radius:8px;padding:10px 14px;margin-bottom:14px;
          display:flex;flex-wrap:wrap;gap:18px;align-items:center;font-size:13pt}
.identite .note{margin-left:auto;font-family:'Trebuchet MS',sans-serif;font-weight:700;font-size:17pt}
.consigne{background:#eef4f9;border-left:6px solid #1b3a63;border-radius:6px;padding:9px 13px;
          margin-bottom:12px;font-size:12pt}
.pts{float:right;font-weight:700;color:#ff6b35;font-family:'Trebuchet MS',sans-serif}
.grille{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:8px}
.case{border:1.5px solid #b9c2cc;border-radius:7px;padding:6px 4px;text-align:center;break-inside:avoid}
.case svg{display:block;margin:0 auto;overflow:visible}
.case .rep{border-bottom:1px dotted #1b3a63;min-height:2.6em;margin-top:5px;font-size:11pt}
.case .num{font-weight:700;font-size:11pt;color:#5a6472}
.duo{display:grid;grid-template-columns:110px 110px 1fr;gap:10px;align-items:center;
     border:1.5px solid #b9c2cc;border-radius:7px;padding:8px;margin-bottom:8px;break-inside:avoid}
.duo .lignes{font-size:11.5pt}
.duo .lignes div{border-bottom:1px dotted #1b3a63;min-height:1.9em;margin-bottom:5px}
.lg{border-bottom:1px dotted #1b3a63;min-height:1.9em;margin:5px 0}
table{width:100%;border-collapse:collapse;font-size:12pt;margin-bottom:10px}
th,td{border:1px solid #b9c2cc;padding:7px 9px;text-align:left}
th{background:#eef4f9;font-family:'Trebuchet MS',sans-serif;font-size:11pt}
td.vide{height:2.3em}
.schema{width:100%;height:auto;display:block;border:1.5px solid #b9c2cc;border-radius:8px;
        background:#fff;margin-bottom:10px}
.tuyau{fill:none;stroke:#333;stroke-width:2.2}
.tuyau.info{stroke-dasharray:5 4;stroke-width:1.6}
.trou{fill:#fff8f0;stroke:#ff6b35;stroke-width:2.5}
.lettre{font-family:'Trebuchet MS',sans-serif;font-size:28px;font-weight:700;fill:#ff6b35}
.num{font-family:'Trebuchet MS',sans-serif;font-size:15px;font-weight:700;fill:#1b3a63}
.saut{break-before:page;page-break-before:always}
.corrige{background:#f6fbf7}
.corrige h2{background:#16a34a}
.bareme{font-size:12pt}
.bareme li{margin-bottom:4px}
ol,ul{margin:6px 0 10px 22px}
.pied{margin-top:22px;border-top:1px solid #b9c2cc;padding-top:6px;font-size:10pt;color:#5a6472}
@media print{body{padding:0;font-size:12pt}.noprint{display:none}}
"""


def bandeau(titre, sous):
    return ('<div class="bandeau"><span style="font-size:20pt">❄</span>'
            '<h1>%s</h1><span class="edu">Édu</span>'
            '<span class="sign">%s</span></div>' % (titre, sous))


h = ['<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">',
     '<meta name="viewport" content="width=device-width,initial-scale=1">',
     '<title>Interrogation — Symboles des éléments thermodynamiques</title>',
     '<style>%s</style></head><body>' % CSS]

# ============================================================ SUJET
h.append(bandeau('Interrogation — Symboles des éléments thermodynamiques',
                 'inerWeb · par F. Henninot'))
h.append('<div class="identite"><span>NOM : ________________________</span>'
         '<span>Prénom : ________________</span><span>Classe : __________</span>'
         '<span>Date : ____ / ____ / ______</span>'
         '<span class="note">…… / 20</span></div>')
h.append('<div class="consigne"><strong>55 minutes. Aucun document autorisé.</strong> '
         'Écris au stylo. Une réponse illisible est comptée fausse. '
         'Si tu ne sais pas, applique les règles : elles suffisent à répondre à la plupart des questions.</div>')

# --- Exercice 1
h.append('<h2>Exercice 1 — Lire un symbole avec les règles <span class="pts">4 points</span></h2>')
h.append('<div class="consigne">Ces quatre symboles n\'ont pas été étudiés en classe. '
         'Pour chacun : dis ce que c\'est, et indique la règle qui te permet de le dire.</div>')
h.append('<div class="grille" style="grid-template-columns:repeat(4,1fr)">')
for k, (sid, _, _) in enumerate(EX1):
    h.append('<div class="case"><div class="num">1.%d</div>%s'
             '<div class="rep"></div><div class="rep"></div></div>' % (k + 1, svg(sid, 86)))
h.append('</div>')
h.append('<h3>1.5 — Complète (0,5 point par trou)</h3>')
h.append('<p>Sur un schéma, un trait <strong>plein</strong> transporte ______________________, '
         'un trait <strong>pointillé</strong> transporte ______________________.</p>')
h.append('<p style="margin-top:8px">Dans une bulle d\'instrument, la <strong>première lettre</strong> indique '
         '______________________ et la <strong>lettre suivante</strong> indique '
         '______________________.</p>')

# --- Exercice 2
h.append('<h2>Exercice 2 — Nommer <span class="pts">5 points</span></h2>')
h.append('<div class="consigne">Écris le nom exact de chaque symbole. 0,5 point par bonne réponse.</div>')
h.append('<div class="grille">')
for k, sid in enumerate(EX2):
    h.append('<div class="case"><div class="num">%d</div>%s<div class="rep"></div></div>'
             % (k + 1, svg(sid, 78)))
h.append('</div>')

# --- Exercice 3
h.append('<h2 class="saut">Exercice 3 — Les paires qui se ressemblent <span class="pts">5 points</span></h2>')
h.append('<div class="consigne">Pour chaque paire : nomme le symbole de gauche, puis celui de droite. '
         '0,5 point par symbole.</div>')
for k, (a, b, _) in enumerate(EX3):
    h.append('<div class="duo"><div style="text-align:center">%s</div>'
             '<div style="text-align:center">%s</div>'
             '<div class="lignes"><div>Gauche : </div><div>Droite : </div></div></div>'
             % (svg(a, 82), svg(b, 82)))

# --- Exercice 4
h.append('<h2>Exercice 4 — Le schéma d\'installation <span class="pts">4 points</span></h2>')
h.append('<div class="consigne">Huit organes ont été effacés et remplacés par une lettre. '
         'Écris leur nom dans le tableau. 0,5 point par bonne réponse.</div>')
h.append(schema({n: L for n, L in A_TROUVER}))
h.append('<table><tr>' + ''.join('<th>%s</th>' % L for _, L in A_TROUVER) + '</tr>'
         '<tr>' + '<td class="vide"></td>' * len(A_TROUVER) + '</tr></table>')

# --- Exercice 5
h.append('<h2>Exercice 5 — Le parcours du fluide <span class="pts">2 points</span></h2>')
h.append('<div class="consigne">Indique dans quel état se trouve le fluide frigorigène sur chaque portion. '
         'Précise à chaque fois : gaz ou liquide, HP ou BP. 0,5 point par ligne.</div>')
h.append('<table><tr><th style="width:52%">Portion du circuit</th><th>État du fluide</th></tr>')
for portion, _ in EX5:
    h.append('<tr><td>%s</td><td class="vide"></td></tr>' % portion)
h.append('</table>')
h.append('<div class="pied">inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO</div>')

# ============================================================ CORRIGÉ
h.append('<div class="corrige saut">')
h.append(bandeau('Corrigé et barème', 'Document enseignant — ne pas distribuer'))

h.append('<h2>Exercice 1 — 4 points</h2><ol class="bareme">')
for sid, regle, rep in EX1:
    h.append('<li><strong>%s</strong> — %s <em>(règle %s)</em> — 0,5 pt '
             '(0,25 pour le nom, 0,25 pour la règle)</li>'
             % (SYM[sid]['nom'], rep, regle))
h.append('</ol>')
h.append('<p><strong>1.5</strong> — plein : <em>du fluide</em> · pointillé : <em>de l\'information</em> · '
         '1re lettre : <em>la grandeur mesurée (P pression, T température)</em> · '
         'lettre suivante : <em>ce que fait l\'appareil (Z sécurité, S ou C régulation, I indication)</em>. '
         '0,5 pt par trou, soit 2 pts.</p>')
h.append('<p style="margin-top:6px"><strong>Total exercice 1 : 2 + 2 = 4 points.</strong></p>')

h.append('<h2>Exercice 2 — 5 points</h2><ol class="bareme">')
for sid in EX2:
    h.append('<li><strong>%s</strong></li>' % SYM[sid]['nom'])
h.append('</ol><p>0,5 pt par bonne réponse. '
         'Accepter toute formulation équivalente sans ambiguïté (« déshydrateur » pour '
         '« filtre déshydrateur »). Refuser « condenseur » seul si le symbole porte EV.</p>')

h.append('<h2>Exercice 3 — 5 points</h2><ol class="bareme">')
for a, b, diff in EX3:
    h.append('<li><strong>%s</strong> / <strong>%s</strong> — %s</li>'
             % (SYM[a]['nom'], SYM[b]['nom'], diff))
h.append('</ol><p>0,5 pt par symbole. <strong>Une inversion dans une paire = 0 pour la paire</strong> : '
         'c\'est la même erreur commise deux fois, pas deux erreurs indépendantes.</p>')

h.append('<h2>Exercice 4 — 4 points</h2><table><tr><th>Lettre</th><th>Repère</th><th>Organe attendu</th></tr>')
noms = {r['n']: r['nom'] for r in D['schema']}
for n, L in A_TROUVER:
    h.append('<tr><td><strong>%s</strong></td><td>%d</td><td>%s</td></tr>' % (L, n, noms[n]))
h.append('</table><p>0,5 pt par bonne réponse. Accepter « évaporateur » et « condenseur » sans précision '
         '« à air » : le repérage est ce qui est évalué ici.</p>')
h.append(schema({}))

h.append('<h2>Exercice 5 — 2 points</h2><table><tr><th>Portion</th><th>État attendu</th></tr>')
for portion, etat in EX5:
    h.append('<tr><td>%s</td><td><strong>%s</strong></td></tr>' % (portion, etat))
h.append('</table><p>0,5 pt par ligne. Formulations reprises du document de référence (p. 81 à 83). '
         'Accepter « liquide BP » ou « liquide basse pression » indifféremment. '
         'Refuser « gaz BP » en sortie de détendeur.</p>')

h.append('<h2>Récapitulatif du barème</h2><table>'
         '<tr><th>Exercice</th><th>Objet</th><th>Points</th></tr>'
         '<tr><td>1</td><td>Lire un symbole inconnu avec les règles</td><td>4</td></tr>'
         '<tr><td>2</td><td>Nommer 10 symboles</td><td>5</td></tr>'
         '<tr><td>3</td><td>Distinguer 5 paires proches</td><td>5</td></tr>'
         '<tr><td>4</td><td>Repérer 8 organes sur le schéma</td><td>4</td></tr>'
         '<tr><td>5</td><td>État du fluide sur les 4 portions</td><td>2</td></tr>'
         '<tr><td colspan="2"><strong>Total</strong></td><td><strong>20</strong></td></tr></table>')

h.append('<h2>Positionnement par compétence</h2>'
         '<p>Compétence évaluée : <strong>C2 Analyser les données techniques</strong>. '
         'Savoir associé : <strong>S3 Analyse technique</strong>.</p><ul class="bareme">'
         '<li><strong>Acquis</strong> — 14/20 et plus, dont au moins 3/4 à l\'exercice 1.</li>'
         '<li><strong>En cours</strong> — de 10 à 13,5/20, ou 14 et plus avec moins de 2/4 à l\'exercice 1 '
         '(l\'élève a mémorisé sans comprendre la règle).</li>'
         '<li><strong>Non acquis</strong> — moins de 10/20.</li></ul>'
         '<p>L\'exercice 1 pèse dans le positionnement au-delà de son barème : c\'est le seul '
         'où l\'élève ne peut pas s\'en sortir par mémorisation.</p>')

h.append('<div class="pied">inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO</div>')
h.append('</div></body></html>')

dest = os.path.join(RACINE, 'interrogation.html')
io.open(dest, 'w', encoding='utf-8').write(''.join(h))
print('interrogation.html écrit (%.0f Ko)' % (os.path.getsize(dest) / 1024))


# ===========================================================================
#                          CARNET ÉLÈVE — 4 pages
# ===========================================================================
_ICI = os.path.dirname(os.path.abspath(__file__))
exec(io.open(os.path.join(_ICI, 'carnet.py'), encoding='utf-8').read())

# ===========================================================================
#                     MÉMO FRIGORISTE — module 2, 4 pages
# ===========================================================================
exec(io.open(os.path.join(_ICI, 'memo.py'), encoding='utf-8').read())
