# -*- coding: utf-8 -*-
"""Mémo frigoriste — 4 pages A4 récapitulant le module 2.

La fiche que l'élève glisse dans sa caisse à outils : ordres de montage,
classement des régulateurs, séquences de commande.

Exécuté par outils/generer-documents.py — ne pas appeler directement.
"""

import subprocess

# donnees-circuits.js est du JavaScript : c'est Node qui le lit, pas une
# expression régulière. Une conversion maison casserait à la première
# apostrophe française dans une chaîne entre guillemets.
_chemin = os.path.join(RACINE, 'donnees-circuits.js').replace('\\', '/')
C = json.loads(subprocess.check_output(
    ['node', '-e',
     "const s=require('fs').readFileSync(" + json.dumps(_chemin) + ",'utf8');"
     "const donnees=eval(s.replace('const CIRCUITS','var CIRCUITS')+';CIRCUITS');"
     "process.stdout.write(JSON.stringify(donnees));"],
    text=True))

CSS_MEMO = CSS + """
.page{break-after:page;page-break-after:always}
.page:last-child{break-after:auto;page-break-after:auto}
.fil{display:flex;flex-wrap:wrap;gap:6px;align-items:stretch;margin:8px 0 12px}
.maillon{width:112px;border:1.5px solid #b9c2cc;border-radius:8px;padding:6px 4px;text-align:center;
         font-size:10pt;line-height:1.2;font-weight:700;break-inside:avoid}
.maillon svg{display:block;margin:0 auto;overflow:visible}
.maillon.bout{background:#eef4f9;border-color:#1b3a63}
.num{display:inline-block;background:#1b3a63;color:#fff;border-radius:50%;width:20px;height:20px;
     text-align:center;line-height:20px;font-size:10pt;font-weight:700;margin-right:6px}
.pourquoi{font-size:11pt;border-left:4px solid #ff6b35;padding:4px 0 4px 10px;margin:0 0 9px 0}
.pourquoi b{display:block;color:#1b3a63}
.etape{display:grid;grid-template-columns:26px 1fr;gap:8px;align-items:start;padding:4px 0;
       border-bottom:1px solid #e3e7eb;font-size:11.5pt;break-inside:avoid}
.piege{border:1.5px solid #f0c9c9;background:#fdf6f6;border-radius:8px;padding:8px 11px;
       margin-bottom:8px;font-size:11pt;break-inside:avoid}
.piege b{color:#dc2626}
.amont{background:#eafaf1;color:#16a34a;font-weight:700;padding:1px 8px;border-radius:999px;font-size:10pt}
.aval{background:#fef3c7;color:#b45309;font-weight:700;padding:1px 8px;border-radius:999px;font-size:10pt}
.mnemo{background:#fff1eb;border-left:6px solid #ff6b35;border-radius:6px;padding:10px 14px;
       font-weight:700;font-size:12.5pt;margin:10px 0}
"""

m = ['<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">',
     '<meta name="viewport" content="width=device-width,initial-scale=1">',
     '<title>Mémo frigoriste — Circuits, régulateurs et séquences</title>',
     '<style>%s</style></head><body>' % CSS_MEMO]

# ------------------------------------------------------- page 1 : les chaînes
m.append('<div class="page">')
m.append(bandeau('Mémo frigoriste — les ordres de montage', 'inerWeb · par F. Henninot'))
m.append('<div class="consigne">Un ordre de montage n\'est jamais une question de goût. '
         'Chaque position se justifie — et c\'est la justification qu\'on demande en évaluation, '
         'pas la liste.</div>')

for ch in C['chaines']:
    m.append('<h2>%s — %s</h2>' % (ch['titre'], ch['sous']))
    m.append('<div class="fil">')
    m.append('<div class="maillon bout">%s%s</div>' % (svg(ch['depart']['id'], 54), ch['depart']['nom']))
    for e in ch['elements']:
        m.append('<div class="maillon">%s%s</div>' % (svg(e['id'], 54), e['nom']))
    m.append('<div class="maillon bout">%s%s</div>' % (svg(ch['arrivee']['id'], 54), ch['arrivee']['nom']))
    m.append('</div>')
    for k, e in enumerate(ch['elements']):
        m.append('<div class="pourquoi"><b><span class="num">%d</span>%s</b>%s</div>'
                 % (k + 1, e['nom'], e['pourquoi']))
m.append('</div>')

# --------------------------------------------- page 2 : les règles de métier
m.append('<div class="page">')
m.append('<h2>Les règles du métier</h2>')
for ch in C['chaines']:
    m.append('<h3>%s</h3>' % ch['titre'])
    for r in ch['regles']:
        m.append('<div class="pourquoi"><b>%s</b>%s</div>' % (r['titre'], r['texte']))

g = C['groupe']
m.append('<h2>%s</h2>' % g['titre'])
m.append('<div class="consigne">%s</div>' % g['sous'])
m.append('<table><tr><th style="width:50%">Livré sur le châssis</th>'
         '<th>À monter sur site</th></tr><tr><td style="vertical-align:top">')
m.append('<ul style="margin-left:18px">' +
         ''.join('<li>%s</li>' % o['nom'] for o in g['dedans']) + '</ul>')
m.append('</td><td style="vertical-align:top">')
m.append('<ul style="margin-left:18px">' +
         ''.join('<li>%s</li>' % o['nom'] for o in g['dehors']) + '</ul>')
m.append('</td></tr></table>')
m.append('<div class="mnemo">Tout ce qui touche à l\'évaporateur est du côté « site ». '
         'Tout ce qui touche au compresseur et au condenseur est sur le châssis.</div>')
m.append('</div>')

# ------------------------------------------------- page 3 : les régulateurs
R = C['regulateurs']
m.append('<div class="page">')
m.append('<h2>%s — %s</h2>' % (R['titre'], R['sous']))
m.append('<div class="consigne"><strong>%s</strong> %s</div>' % (R['cle']['titre'], R['cle']['texte']))
m.append('<div class="mnemo">%s</div>' % R['mnemo'])
m.append('<table><tr><th></th><th>Symbole</th><th>Surveille</th><th>Monté</th><th>Protège</th></tr>')
for r in R['liste']:
    m.append('<tr><td style="white-space:nowrap"><strong>%s</strong><br>'
             '<span style="font-size:10pt;font-weight:400">%s</span></td>'
             '<td style="text-align:center">%s</td>'
             '<td><span class="%s">%s</span></td><td>%s</td><td>%s</td></tr>'
             % (r['sigle'], r['nom'], svg(r['id'], 72), r['surveille'],
                'son entrée' if r['surveille'] == 'amont' else 'sa sortie',
                r['monte'], r['protege']))
m.append('</table>')
for r in R['liste']:
    m.append('<div class="pourquoi"><b>%s — quand en a-t-on besoin ?</b>%s</div>' % (r['sigle'], r['quand']))
    if r.get('coequipier'):
        m.append('<div class="pourquoi"><b>%s — son coéquipier</b>%s</div>' % (r['sigle'], r['coequipier']))
m.append('<div class="note" style="font-size:11pt">%s</div>' % R['reserve'])
m.append('</div>')

# ---------------------------------------------------- page 4 : les séquences
m.append('<div class="page">')
m.append('<h2>Les séquences de commande</h2>')
for s in C['sequences']:
    m.append('<h3>%s — %s</h3>' % (s['titre'], s['sous']))
    if s.get('organes'):
        m.append('<div class="consigne" style="font-size:11pt">%s</div>' % s['organes'])
    for k, e in enumerate(s['etapes']):
        m.append('<div class="etape"><span class="num">%d</span><span>%s</span></div>' % (k + 1, e['t']))
    for p_ in s['pieges']:
        m.append('<div class="piege"><b>%s</b><br>%s</div>' % (p_['titre'], p_['texte']))
m.append('<div class="pied">inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO</div>')
m.append('</div></body></html>')

dest_m = os.path.join(RACINE, 'memo-frigoriste.html')
io.open(dest_m, 'w', encoding='utf-8').write(''.join(m))
print('memo-frigoriste.html écrit (%.0f Ko)' % (os.path.getsize(dest_m) / 1024))
