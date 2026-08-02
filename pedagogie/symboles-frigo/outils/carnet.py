# -*- coding: utf-8 -*-
"""Carnet élève — 4 pages A4 à imprimer recto-verso.

Ce fichier est exécuté par outils/generer-documents.py et réutilise ses
fonctions (svg, schema, bandeau) ainsi que les données D et SYM.
Ne pas l'appeler directement.
"""

CSS_CARNET = CSS + """
.page{break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
.cadre{border:1.5px solid #b9c2cc;border-radius:8px;padding:9px 12px;margin-bottom:9px;break-inside:avoid}
.cadre .titre{font-family:'Trebuchet MS',sans-serif;font-weight:700;font-size:11.5pt;color:#ff6b35;
              margin-bottom:4px}
.reglure div{border-bottom:1px dotted #1b3a63;height:1.75em}
.fam{border:1.5px solid #b9c2cc;border-radius:8px;padding:7px 10px;margin-bottom:7px;break-inside:avoid;
     display:grid;grid-template-columns:190px 1fr;gap:10px;align-items:stretch}
.fam .nom{font-weight:700;font-size:11.5pt;align-self:center}
.fam .dessins{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.fam .boite{border:1px dashed #b9c2cc;border-radius:6px;height:74px}
.diff{display:grid;grid-template-columns:150px 1fr;gap:10px;align-items:center;
      border-bottom:1px solid #e3e7eb;padding:5px 0;break-inside:avoid}
.diff .paire{font-weight:700;font-size:10.5pt}
.diff .ligne{border-bottom:1px dotted #1b3a63;min-height:1.8em}
.coche{list-style:none;margin-left:0}
.coche li{margin-bottom:5px}
.coche li::before{content:"☐  ";font-size:15pt}
"""

c = ['<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">',
     '<meta name="viewport" content="width=device-width,initial-scale=1">',
     '<title>Carnet élève — Le Circuit Fantôme</title>',
     '<style>%s</style></head><body>' % CSS_CARNET]

# ------------------------------------------------------------------- page 1
c.append('<div class="page">')
c.append(bandeau('Carnet de bord — Le Circuit Fantôme', 'inerWeb · par F. Henninot'))
c.append('<div class="identite"><span>NOM : ________________________</span>'
         '<span>Prénom : ________________</span><span>Classe : __________</span>'
         '<span>Date : ____ / ____ / ______</span></div>')

c.append('<h3>Avant de commencer — je coche ce que je sais déjà faire</h3>')
c.append('<ul class="coche">'
         '<li>Je sais nommer les 4 organes principaux d\'un circuit frigorifique.</li>'
         '<li>Je sais ce que veulent dire HP et BP.</li>'
         '<li>Je sais qu\'un fluide frigorigène change d\'état au cours du cycle.</li>'
         '<li>Je sais lire un schéma de principe simple.</li>'
         '</ul>')

c.append('<h2>Page 1 — Les 8 règles, écrites avec MES mots</h2>')
c.append('<div class="consigne">À chaque règle débloquée dans l\'atelier 1, écris-la ici. '
         '<strong>Ne recopie pas l\'écran.</strong> Si tu n\'arrives pas à la dire autrement, '
         'c\'est que tu ne l\'as pas encore comprise — relis l\'exemple et recommence.</div>')
for r in D['regles']:
    c.append('<div class="cadre"><div class="titre">Règle %s</div>'
             '<div class="reglure"><div></div><div></div></div></div>' % r['cle'])
c.append('</div>')

# ------------------------------------------------------------------- page 2
c.append('<div class="page">')
c.append('<h2>Page 2 — Les 8 familles</h2>')
c.append('<div class="consigne">Pour chaque famille, dessine <strong>trois symboles à main levée</strong>. '
         'Dessiner à la main est ce qui grave le symbole dans la mémoire — beaucoup plus que de le '
         'reconnaître à l\'écran. Écris son nom sous chaque dessin.</div>')
for g in D['groupes']:
    n = len([s for s in D['symboles'] if s['groupe'] == g['cle']])
    c.append('<div class="fam" style="border-left:6px solid %s">'
             '<div class="nom">%s<br><span style="font-weight:400;font-size:10pt;color:#5a6472">'
             '%d symboles</span></div>'
             '<div class="dessins"><div class="boite"></div><div class="boite"></div>'
             '<div class="boite"></div></div></div>' % (g['couleur'], g['nom'], n))
c.append('</div>')

# ------------------------------------------------------------------- page 3
c.append('<div class="page">')
c.append('<h2>Page 3 — Les 12 pièges</h2>')
c.append('<div class="consigne">Pour chaque paire, écris <strong>le détail qui les sépare</strong>, '
         'en une seule ligne. Format imposé : « … se distinguent par … ». '
         'Une ligne floue ne te servira à rien le jour de l\'interrogation.</div>')
for p_ in D['pieges']:
    a, b_ = SYM[p_['paire'][0]], SYM[p_['paire'][1]]
    c.append('<div class="diff"><div class="paire">%s<br>et %s</div>'
             '<div class="ligne"></div></div>' % (a['nom'], b_['nom']))
c.append('</div>')

# ------------------------------------------------------------------- page 4
c.append('<div class="page">')
c.append('<h2>Page 4 — Le circuit, et ce qu\'il me reste à réviser</h2>')
c.append('<div class="consigne">Écris le nom de chaque organe à côté de son numéro. '
         'Puis trace au surligneur les 4 portions du circuit et indique l\'état du fluide sur chacune.</div>')
c.append(schema({r['n']: '' for r in D['schema']}))

c.append('<h3>Les 4 portions du circuit</h3>')
c.append('<table><tr><th style="width:52%">Portion</th><th>État du fluide (gaz/liquide, HP/BP)</th></tr>'
         '<tr><td>Du compresseur (1) vers le condenseur (10)</td><td class="vide"></td></tr>'
         '<tr><td>Du condenseur (10) vers le détendeur (15)</td><td class="vide"></td></tr>'
         '<tr><td>Du détendeur (15) vers l\'évaporateur (17)</td><td class="vide"></td></tr>'
         '<tr><td>De l\'évaporateur (17) vers le compresseur (1)</td><td class="vide"></td></tr></table>')

c.append('<h3>Après l\'épreuve blanche — mes consignes de révision</h3>')
c.append('<div class="consigne">Recopie ici les familles où ton score n\'était pas complet. '
         'C\'est <strong>toi</strong> qui écris ta liste : c\'est ce que tu réviseras à la maison.</div>')
c.append('<div class="cadre"><div class="reglure">'
         '<div></div><div></div><div></div><div></div></div></div>')

c.append('<h3>Mon suivi maison — 7 jours</h3>')
c.append('<table><tr>' + ''.join('<th style="text-align:center">J%d</th>' % (i + 1) for i in range(7)) + '</tr>'
         '<tr>' + '<td class="vide" style="text-align:center">☐</td>' * 7 + '</tr></table>')
c.append('<p style="font-size:11pt;color:#5a6472">Une séance par jour dans l\'application. '
         'Pas deux, pas zéro. Coche la case le soir même.</p>')

c.append('<div class="pied">inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO</div>')
c.append('</div></body></html>')

dest_c = os.path.join(RACINE, 'carnet-eleve.html')
io.open(dest_c, 'w', encoding='utf-8').write(''.join(c))
print('carnet-eleve.html écrit (%.0f Ko)' % (os.path.getsize(dest_c) / 1024))
