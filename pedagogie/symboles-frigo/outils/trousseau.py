# -*- coding: utf-8 -*-
"""Le trousseau imprimable — une fiche par organe, deux fiches par page A4.

C'est le document que l'élève garde ouvert à côté de lui pendant les ateliers,
et qu'il relit avant l'interrogation. Chaque fiche répond à quatre questions,
toujours dans le même ordre — c'est cette régularité qui la rend consultable.

Exécuté par outils/generer-documents.py — ne pas appeler directement.
"""

CSS_TROUSSEAU = CSS + """
.fiche{border:2px solid #b9c2cc;border-radius:10px;padding:12px 15px;margin-bottom:12px;
       break-inside:avoid;page-break-inside:avoid;display:grid;
       grid-template-columns:120px 1fr;gap:14px}
.fiche .col-sym{text-align:center;border-right:1.5px solid #e3e7eb;padding-right:10px}
.fiche .col-sym svg{display:block;margin:0 auto;overflow:visible}
.fiche .col-sym .photo{max-width:100%;max-height:70px;margin-top:6px;border-radius:5px}
.fiche .col-sym .fam{font-size:9pt;color:#5a6472;text-transform:uppercase;letter-spacing:.04em;
                     margin-top:6px;line-height:1.2}
.fiche h3{font-size:13.5pt;margin:0 0 7px 0}
.fiche .num{color:#ff6b35;margin-right:6px}
.bl{margin-bottom:7px;font-size:11pt;line-height:1.42}
.bl b{font-family:'Trebuchet MS',sans-serif;font-size:10pt;display:block;margin-bottom:1px}
.bl.quoi b{color:#1b3a63}
.bl.pourquoi b{color:#ff6b35}
.bl.ou b{color:#16a34a}
.bl.sert b{color:#2d5688}
.fiche .conf{margin-top:6px;font-size:10pt;color:#dc2626;border-top:1px dashed #f0c9c9;padding-top:5px}
.sommaire{columns:2;column-gap:26px;font-size:11pt}
.sommaire div{break-inside:avoid;margin-bottom:3px}
.sommaire .n{display:inline-block;width:26px;color:#ff6b35;font-weight:700}
h2.fam{background:#1b3a63;color:#fff;font-size:13pt;margin:18px 0 10px;padding:5px 11px;border-radius:6px}
"""

t = ['<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">',
     '<meta name="viewport" content="width=device-width,initial-scale=1">',
     '<title>Le trousseau — les 53 fiches</title>',
     '<style>%s</style></head><body>' % CSS_TROUSSEAU]

t.append(bandeau('Le trousseau — les 53 organes', 'inerWeb · par F. Henninot'))
t.append('<div class="consigne">Une fiche par organe. Elle ne dit pas encore comment il fonctionne : '
         'elle dit <strong>ce que c\'est</strong>, <strong>pourquoi ça existe</strong>, '
         '<strong>où ça se trouve</strong> et <strong>à quoi ça sert</strong>. '
         'C\'est ce qu\'il faut savoir avant tout le reste — le fonctionnement viendra ensuite.</div>')

if not any(x.get('photo') for x in D['symboles']):
    t.append('<div class="note" style="font-size:10.5pt">Ce trousseau ne contient que les symboles '
             'normalisés. Pour y ajouter une photo de chaque organe — idéalement celui de l\'atelier — '
             'voir <code>photos/LISEZ-MOI.md</code>.</div>')

# --------------------------------------------------------------- sommaire
t.append('<h3>Sommaire</h3><div class="sommaire">')
for k, s in enumerate(D['symboles']):
    t.append('<div><span class="n">%d</span>%s</div>' % (k + 1, s['nom']))
t.append('</div>')

# ------------------------------------------------------------- les fiches
pieges = {p['cle']: p for p in D['pieges']}
groupes = {g['cle']: g for g in D['groupes']}

num = 0
groupe_courant = None
for s in D['symboles']:
    num += 1
    if s['groupe'] != groupe_courant:
        groupe_courant = s['groupe']
        t.append('<h2 class="fam">%s</h2>' % groupes[groupe_courant]['nom'])

    conf = ''
    if s.get('piege'):
        p_ = pieges[s['piege']]
        autre = [x for x in p_['paire'] if x != s['id']]
        if autre:
            nom_autre = SYM[autre[0]]['nom']
            conf = ('<div class="conf">⚠ À ne pas confondre avec : <strong>%s</strong>. %s</div>'
                    % (nom_autre, p_['texte']))

    t.append(
        '<div class="fiche">'
        '<div class="col-sym">%s%s<div class="fam">%s<br>%s</div></div>'
        '<div>'
        '<h3><span class="num">%d</span>%s</h3>'
        '<div class="bl quoi"><b>C\'est quoi ?</b>%s</div>'
        '<div class="bl pourquoi"><b>Pourquoi ça existe ?</b>%s</div>'
        '<div class="bl ou"><b>Où ça se trouve ?</b>%s</div>'
        '<div class="bl sert"><b>À quoi ça sert ?</b>%s</div>'
        '%s</div></div>'
        % (svg(s['id'], 92),
           ('<img class="photo" src="%s" alt="">' % s['photo']) if s.get('photo') else '',
           groupes[s['groupe']]['nom'],
           ('page %s' % s['page']) if s.get('page') else 'hors document',
           num, s['nom'], s['objet'], s['probleme'], s['ou'], s['fonction'], conf))

t.append('<div class="pied">inerWeb Édu — F. Henninot — LP Privé Jacques Raynaud, Campus ÉQUATIO</div>')
t.append('</body></html>')

dest_t = os.path.join(RACINE, 'trousseau.html')
io.open(dest_t, 'w', encoding='utf-8').write(''.join(t))
print('trousseau.html écrit (%.0f Ko)' % (os.path.getsize(dest_t) / 1024))
