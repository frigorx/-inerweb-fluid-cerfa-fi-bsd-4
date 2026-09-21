# De la sécurité minimum au pump-down — ce qui change sur le bornier

Lecture des deux folios du fonds, faite le 21/09 pour préparer le TP du 28/09 et du 05/10.
**Tout ce qui suit est une lecture de tes documents, à confirmer sur le bornier réel avant
la séance.** Rien n'est déduit d'un raisonnement : chaque liaison vient d'un trait visible
sur un folio.

---

## 1. Le blocage : les deux folios ne numérotent pas pareil

| Récepteur | Folio **sécurité minimum** | Folio **pump-down** | Bornier réel (folio 3/12) |
|---|---|---|---|
| Vanne électromagnétique | borne **6** · neutre **N5** | borne **7** · neutre **N6** | **N6 · 7** |
| Moteur 1 (compresseur) | borne **14** · neutre **N13** | borne **15** · neutre **N14** | **N14 · 15** |
| Moteur 2 (condenseur) | borne **16** · neutre **N15** | borne **17** · neutre **N16** | **N16 · 17** |
| Pressostat BP | nommé **PZL** | nommé **PSL** | — |

Le folio pump-down est **d'accord avec le bornier**. Le folio sécurité minimum a **un
décalage d'une borne sur tous les récepteurs** : il appelle « 6 » ce que le bornier appelle
« 7 », et ainsi de suite. Sur le bornier réel, la borne 6 n'existe pas comme borne de
phase — **N6 est une borne de neutre**.

**Pourquoi c'est bloquant pour ce TP précis.** Tout l'exercice consiste à repérer les bornes
et à ne déplacer que ce qu'il faut. Si les deux schémas ne désignent pas la même borne par
le même numéro, l'élève ne peut pas comparer : il verra des écarts qui n'existent pas, et
ratera ceux qui existent.

À cela s'ajoute la coquille déjà connue : **les deux folios portent deux fois le repère 9**
sur les sorties du pressostat BP. La seconde est la borne **10**.

## 2. Les deux montages, lus borne par borne

### Sécurité minimum — les trois appareils en série

| Départ | Arrivée | Ce que ça fait |
|---|---|---|
| 2 | 3 | l'arrivée alimente le commun du thermostat |
| 4 (sortie TH) | 8 | la sortie du thermostat alimente le commun du pressostat BP |
| 10 (sortie BP) | 11 | la sortie du BP alimente le commun du pressostat HP |
| 12 (sortie HP) | 7 · 15 · 17 | la sortie du HP alimente **ensemble** la vanne, le compresseur et le condenseur |

Tout est en série derrière le thermostat. **Quand TH coupe, tout s'arrête en même temps, y
compris le compresseur.** Le fluide reste dans l'évaporateur : c'est précisément le défaut
que le pump-down corrige.

### Pump-down — le thermostat sort de la chaîne de sécurité

| Départ | Arrivée | Ce que ça fait |
|---|---|---|
| 2 | 3 | l'arrivée alimente le commun du thermostat |
| 2 | 8 | l'arrivée alimente **aussi, directement**, le commun du pressostat BP |
| 4 (sortie TH) | 7 | la sortie du thermostat ne commande plus que **la vanne** |
| 10 (sortie BP) | 11 | inchangé |
| 12 (sortie HP) | 15 · 17 | la sortie du HP alimente **seulement** le compresseur et le condenseur |

Le thermostat ne coupe plus le compresseur : il ferme la vanne. Le compresseur continue
seul, aspire le fluide, et c'est le pressostat BP qui l'arrête quand l'évaporateur est vide.

## 3. Les trois gestes de la transformation

C'est le cœur de la séance du 05/10. **Trois gestes, pas un de plus.**

| | Geste | Liaison |
|---|---|---|
| 1 | **Déplacer** | `4 → 8` devient `4 → 7` — la sortie du thermostat quitte le commun du pressostat BP et va à la vanne |
| 2 | **Ajouter** | `2 → 8` — le commun du pressostat BP est désormais alimenté directement par l'arrivée |
| 3 | **Retirer** | `12 → 7` — la vanne n'est plus alimentée par la sortie du pressostat HP |

Restent **inchangés** : `2 → 3`, `10 → 11`, `12 → 15`, `12 → 17`, et tous les neutres.

Trois gestes sur sept liaisons : la proportion est bonne pour l'exercice. L'élève qui
décâble tout n'a rien compris ; celui qui ne touche à rien non plus.

## 4. La question de cours qui va avec

> « Le thermostat coupe. Dans le montage sécurité minimum, qu'est-ce qui s'arrête ?
> Dans le montage pump-down, qu'est-ce qui s'arrête — et qu'est-ce qui continue ? »

C'est la seule question à poser, et elle contient tout le TP.

## 4 bis. Ce qui a été corrigé le 21/09, une fois la numérotation tranchée

Franck a tranché : **7 · 15 · 17 font foi**, ceux du bornier réel et du folio pump-down.

Le fichier `assets/schema-securite-minimum.png` a donc été réétiqueté : `6 → 7`,
`14 → 15`, `16 → 17`, `N5 → N6`, `N13 → N14`, `N15 → N16`. **Seules les étiquettes de
bornes ont changé ; aucun trait, aucun symbole, aucune liaison n'a été touché.**

Deux remarques honnêtes sur cette retouche :

- La police des nouveaux repères n'est pas exactement celle du folio d'origine — aucune
  police du poste ne correspondait à cette largeur. Les repères sont nets et lisibles, mais
  un œil attentif verra qu'ils ont été refaits. **Une ré-exportation propre depuis le projet
  QElectroTech d'origine donnerait mieux**, quand tu auras cinq minutes.
- Le PNG était aussi **rogné à droite** : les repères du troisième récepteur (`16` et `N15`)
  étaient coupés en plein glyphe, et ce depuis le TP distribué le 21/09. C'est réparé, les
  six repères sont désormais entiers.

`assets/schema-a-completer.png` a été vérifié : il portait déjà 15 · 17 · N14 · N16. Les
deux figures de la page 4 du TP sont donc maintenant d'accord entre elles.

## 5. Ce qu'il reste à vérifier avant la séance

- [ ] La borne 10, notée 9 par erreur sur les deux folios, confirmée sur le bornier réel.
- [ ] **PSL** ou **PZL** pour le pressostat BP — les deux folios se contredisent, comme
      PZH/PZL ailleurs dans le fonds.
- [ ] Les trois gestes ci-dessus, vérifiés en posant réellement les ponts sur un bornier.
