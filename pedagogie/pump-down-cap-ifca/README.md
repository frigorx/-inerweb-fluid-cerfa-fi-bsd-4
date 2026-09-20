# Séance 2CAP26-S39-02 — Le pump-down simple (CAP IFCA 2A)

Sources HTML des deux documents de la séance du **lundi 21/09/2026, 13h30-17h30**,
mis en page à la **charte inerWeb Édu** (Calibri 14 pt élève / 13 pt professeur,
Trebuchet MS bold en titres, bleu `#1b3a63`, orange `#ff6b35`, fond clair uniquement).

## Ce que couvre la séance

Le cours s'arrête au **pump-down simple**. Trois montages, du moins sûr au plus sûr :

1. **Pas de sécurité** — la commande directe ;
2. **La sécurité minimum** — le pressostat BP ;
3. **Le pump-down simple** — folio 1/12 du jeu « Schéma PUMP DOWN le plus simple du monde ».

Le **pump-down unique** (la variante à relais) n'est pas traité : il est annoncé aux élèves
et ouvre le prochain cours. Le cours de théorie passe donc de 1 h 20 à **1 h** ; des
20 minutes rendues, 15 vont au câblage — **2 h pleines**, 15h10 → 17h10 — et 5 à la synthèse de fin.

## Fichiers

| Fichier | Rôle |
|---|---|
| `charte-inerweb-edu.css` | feuille de style commune aux quatre documents |
| `fiche-cours-eleve.html` | fiche de cours n° 01, 5 pages (élève) |
| `tp-02-b-eleve.html` | TP-02-B élève, 6 pages + 3 pages ressource |
| `seance-professeur.html` | fiche de séance, 7 pages — **non versionné** (voir plus bas) |
| `tp-02-b-professeur.html` | TP-02-B professeur avec corrigé, 8 pages — **non versionné** |
| `construire.py` | assemble les PDF (Chromium + pymupdf) |
| `assets/` | figures et codes QR |

### Documents professeur non versionnés

`seance-professeur.html`, `tp-02-b-professeur.html` et le PDF professeur portent la mention
**« DOCUMENT PROFESSEUR — NE PAS DISTRIBUER »** et contiennent les corrigés B1 et B2.
Ce dépôt étant public, ils sont exclus par le `.gitignore` de ce dossier. Ils vivent à côté,
hors dépôt ; `construire.py` les prend en compte s'ils sont présents et les ignore sinon.

## Construire les PDF

```bash
python3 construire.py
```

Produit `Lundi-21-09-2026-Apres-midi-ELEVE.pdf` (14 pages) et, si les sources professeur sont
présentes, `Lundi-21-09-2026-Apres-midi-PROFESSEUR.pdf` (15 pages).

Prérequis : Python avec `pymupdf`, un Chromium en ligne de commande, et les polices
**Calibri** (ou **Carlito**, métriquement compatible) et **Trebuchet MS**.

## Figures

- `assets/schema-pump-down-simple.svg` — folio 1/12 du jeu « Schéma PUMP DOWN le plus simple
  du monde » (F. Henninot), découpé en vectoriel : lisible à l'écran comme à l'impression.
- `assets/coup-de-liquide.svg` — la planche « on ne comprime pas un liquide ».
- `assets/symbole-th.png`, `symbole-psl.png`, `symbole-pzh.png` — les trois commandes.
- `assets/bornier-ponts.png`, `bornier-complet.png` — photos de bornier du TP.
- `assets/qr/*.svg` — codes QR vers les animations inerweb.fr du pack Fluides.

## Point de vigilance repris du fonds

Le folio source porte **deux fois le numéro 9** sur les sorties du pressostat PSL. Le bornier
a bien 8-9-10 : la sortie 4 du PSL va sur la **borne 10**, et c'est **la borne 10 qui est pontée
sur la borne 11** (commun du PZH). Le corrigé B2 le dit explicitement — à confirmer sur le
bornier réel avant la séance.
