# Carte 2A CAP IFCA — delta de la semaine 5

**Séance 03 · lundi 28/09/2026 · poste E2 · reprise du TP n° 2, version enrichie**

Ce fichier remplace la version écrite le 21/09 au matin, qui annonçait un second passage à
l'identique. La séance du 21/09 ne s'est pas déroulée comme prévu, et le 28/09 change de
nature.

---

## 1. Ce qui s'est réellement passé le 21/09

Une partie des élèves était convoquée par la **Mission locale pour l'emploi**. Moins d'un
quart de la classe était présent. La séance a été écourtée, **le TP n'a pas été évalué** et
aucun câblage n'a été réalisé.

Le temps a été employé en **remédiation** : identification des éléments du schéma, repérage
des bornes, distinction entre un fil et un pont, logique du vidage de l'évaporateur.

Conséquence directe : **la grille HAL du 21/09 reste vierge**. Rien à saisir, et surtout
rien à saisir en `NA` — l'absence d'évaluation n'est pas un niveau. Si des positionnements
doivent être portés pour les quelques présents, c'est `NE` partout sauf sur ce qui a été
réellement observé en remédiation.

## 2. Ce que devient le 28/09 — dicté par Franck le 21/09

On reprend le même TP, avec **une étape de plus, placée avant**. Et comme l'ensemble ne
tient pas en 4 h, **Franck a tranché : on ne sacrifie rien, le TP est scindé sur deux
lundis** — la sécurité minimum notée le **28/09**, la transformation en pump-down le
**05/10**. La colonne E décale d'une semaine.

1. **Câbler le modèle « sécurité minimum »** — le montage déjà connu, thermostat et
   pressostat BP. **Cette partie est notée.**
2. **Puis transformer ce câblage en pump-down** — sans tout refaire : repérer les bornes
   concernées et **déplacer les ponts** qu'il faut déplacer.

C'est un changement de nature, pas un ajout de longueur. L'élève ne part plus d'un bornier
nu : il part d'un montage qui marche, et doit le **modifier**. Le geste évalué n'est plus
seulement « câbler d'après un schéma », c'est « lire un câblage existant, comprendre ce qui
le sépare de la cible, et n'intervenir que là où il faut ».

## 3. Pourquoi c'est mieux que la version du 21/09

Cette forme est **exactement celle du sujet EP2 2023** : *passer une régulation
thermostatique en pump-down d'après le schéma fourni*. Le TP cesse d'être un exercice
d'école et devient une répétition de l'épreuve.

Elle règle aussi un défaut de la version précédente : le tracé sur planche était le verrou
de la séance, mais rien ne garantissait que l'élève **comprenne** le schéma — il pouvait le
recopier. Partir d'un montage existant rend la recopie impossible : il faut avoir identifié
ce qui change.

## 4. Ce que la carte du 16/08 dit pour la semaine 5

| Colonne | Contenu porté par la carte |
|---|---|
| Sem. 5 · s. 2640 · 28/09 → 02/10 · séquence **S11** | |
| **TP Élec / M&S** | **EL12 • Horloge de dégivrage** |
| Codes du référentiel | C3.4 · C4.5 — T10 · T11 — S2.1 · S5.2 |

L'horloge de dégivrage **n'est pas jouée le 28/09**. Elle reste en E4, le 09/11, avec le
régulateur Carel MasterCella.

## 5. Ce qui est réellement joué

| | |
|---|---|
| Poste E2, temps 1 — **28/09** | Câblage du modèle sécurité minimum, **noté** |
| Poste E2, temps 2 — **05/10** | Transformation du câblage en pump-down, ponts déplacés |
| **Rotation E/M** | **Suspendue ces deux lundis** : toute la classe au poste E, 16 élèves en câblage. Chacun transforme son propre montage. Le poste M reprend après l'évaluation sommative de la semaine 7. |
| Compétences | **C3.6** · **C3.7** |
| Tâches | **T10** · **T11** |
| Savoirs | **S5.6** · **S6.2** |
| Grille HAL | `Grille-CAP-IFCA-20260928.json` — refaite pour la version transformation |

## 6. À porter dans la carte

Deux choses, dont une déjà signalée en semaine 4 :

- **Le défaut de structure.** La carte porte un objet de TP Élec différent chaque semaine,
  alors que le dispositif réel en joue un pour deux semaines, puisque les postes E et M
  tournent. Il se reproduira sur chacun des couples restants tant que la colonne ne fusionne
  pas les deux lignes du couple, ou ne marque pas explicitement le second passage.
- **La fragilité de l'effectif.** Une convocation extérieure a suffi à annuler une séance de
  4 h. La carte suppose que chaque lundi est joué ; il faut au moins un repère « séance non
  tenue, à replacer », sinon la progression affichée diverge de la progression réelle dès la
  première semaine.

## 6 bis. Un blocage technique trouvé en préparant

Les deux folios **ne numérotent pas les mêmes bornes de la même façon** : le folio sécurité
minimum appelle la vanne « 6 », les moteurs « 14 » et « 16 », là où le bornier réel et le
folio pump-down disent **7, 15, 17**. Un décalage d'une borne sur tous les récepteurs.

Sur un TP dont tout l'objet est de repérer les bornes et de déplacer les bons ponts, c'est
bloquant : l'élève verrait des écarts qui n'existent pas. **À trancher avant le 28/09.**

Détail complet, les deux montages lus borne par borne et les trois gestes de la
transformation : `ANALYSE-securite-minimum-vers-pump-down.md`.

## 7. À remplir après la séance du 28/09

| Question | Réponse |
|---|---|
| La sécurité minimum a-t-elle été câblée dans le temps prévu ? | |
| Combien d'élèves ont trouvé seuls quels ponts déplacer ? | |
| La transformation a-t-elle été faite sans tout décâbler ? | |
| La note sur le premier câblage a-t-elle été lisible, ou faut-il deux notes ? | |
| Les absents du 21/09 ont-ils suivi, ou faut-il une remédiation séparée ? | |
