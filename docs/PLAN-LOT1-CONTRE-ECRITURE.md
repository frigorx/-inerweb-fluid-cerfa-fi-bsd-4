# PLAN LOT 1 — LA CONTRE-ÉCRITURE : LE DOCUMENT, PAS LE MÉCANISME

> Écrit le 27/07/2026, **AVANT** le code de l'arbitrage (méthode des grosses briques).
> Source : 4ᵉ relecture externe du 27/07 + instruction de la maison. Tout ce qui suit
> a été **TIRÉ**, pas lu : deux parcours complets sur base jetable (FORMATION verrou
> FERMÉ, puis OFFICIEL verrou désarmé **dans une copie jetable du dépôt uniquement**),
> plus un tirage HTTP réel sur le port 2301.
>
> **Le mécanisme comptable n'est pas en cause.** `annulerParContreEcriture` scelle une
> écriture inverse qui désigne l'originale, l'originale ne bouge que d'un statut, la
> chaîne reste verte (`{"ok":true,"casseA":null}` au tirage). Ce qui est en cause est
> le **DOCUMENT** que le logiciel produit pour cette écriture inverse.
>
> **Deux agents codent en parallèle de ce plan** ce qui ne dépend d'aucun arbitrage
> (§ 2). **Une seule question reste ouverte, et elle est au § 4.**

---

## 1. L'état vérifié

### 1.0 Comment il a été vérifié

| Tirage | Décor | Ce qu'il prouve |
|---|---|---|
| **T-A — FORMATION**, verrou FERMÉ (`VERROU_LIVRAISON = true`), base jetable `mkdtemp` | charge d'appoint 0,50 kg de fluide VIERGE, contrôle CONFORME, `executeParId` = un élève, puis contre-écriture motivée | l'état LIVRÉ, celui qui est sous les yeux des élèves aujourd'hui |
| **T-B — OFFICIEL**, verrou désarmé **dans une copie du dépôt** (`scratchpad/copie-officiel`, jamais dans `C:\git\inerweb-fluide`) | même écriture + double signature réelle + PDF final conservé, puis contre-écriture | ce que produirait la réouverture du mode Officiel |
| **T-C — HTTP réel**, port **2301**, `IWF_CHEMIN_BASE` hors dépôt | compte REFERENT lié, écriture validée, contre-écriture par `POST /api/annulerParContreEcriture` | que le comportement n'est pas un artefact du harnais in-process |

`git status` du dépôt : **vide** avant et après. Le `data/` du dépôt n'est **pas** la
base de ces tirages — voir toutefois l'incident consigné au § 5.4.

### 1.1 Les huit points, un par un

| # | Constat de la relecture | Verdict | Preuve à la date du jour |
|---|---|---|---|
| 1 | Le dossier d'audit SCELLÉ embarque un vrai CERFA pour la contre-écriture ; le bouton « Visualiser CERFA » lui est offert | **CONFIRMÉ** | `dossier-audit.js:191-193` ne filtre que `STATUTS_REGISTRE` (`:30` = `['VALIDE','ANNULE']`) et `mv.type !== 'TRANSFERT'` : rien sur `contreEcritureDe`. `views/mouvements.js:75-80` offre les deux boutons dès `VALIDE`/`ANNULE` hors transfert. **Tiré** : l'archive T-A contient `cerfa/FORM-2026-0001.pdf` **et** `cerfa/FORM-2026-0002.pdf` |
| 2 | Le CERFA dit le CONTRAIRE de l'écriture : `11_QA` prend la valeur ABSOLUE | **CONFIRMÉ** | `generateur.js:473-475` (`Math.abs(Number(ctx.quantiteKg))`) puis `:496` (`else qA = fmtVirgule(quantite)`), champ posé `:589`. **Tiré** : contre-écriture de **−0,50 kg** → `11_QA = "0,50"`, **identique à l'originale** |
| 3 | Rien sur le document ne dit qu'il ANNULE | **CONFIRMÉ** | `generateur.js:259-262` : la mention n'est poussée que si `mouvement.statut === 'ANNULE'`, donc sur l'ANNULÉE. **Tiré** : le mot « annul » est présent sur le CERFA de l'originale, **absent** de celui de la contre-écriture, dans les deux modes |
| 4 | Blocs de signature PRÉ-REMPLIS sans que personne n'ait signé | **CONFIRMÉ** | `generateur.js:542-545` (repli `qualiteOperateur`, valeur par défaut « Élève en formation »), `:617-631` (noms, qualités, `dateFr` aux deux blocs). **Tiré T-A** : `Sign_Operateur_Nom = "Referent Lot1"`, `Sign_Operateur_Qualite = "Titulaire attestation d'aptitude"`, `Sign_Operateur_Date = "27/07/2026"`, `Sign_Detenteur_Qualite = "Détenteur de l'équipement"`, `Sign_Detenteur_Date = "27/07/2026"` — sur une écriture dont `hashSignatures` est l'empreinte de la liste **VIDE** |
| 5 | Le MOTIF n'est imprimé sur aucun CERFA ; c'est la « cause » de l'originale qui s'affiche | **CONFIRMÉ, et le second membre est le plus grave** | `api.js:4630-4632` (motif obligatoire), `:4663` (scellé), `:4705-4707` (journal) ; `api.js:4659` recopie `causeMouvement` de l'originale ; `generateur.js:255-257` l'imprime en « Cause : … ». **Tiré** : le motif n'apparaît sur aucun des deux documents ; la cause de l'originale apparaît sur les DEUX, **sans dire qu'elle est celle de l'écriture annulée** |
| 6 | `executeParId` reste null : « Exécuté par » VIDE dans un dossier scellé | **CONFIRMÉ, avec une nuance qui compte** | `api.js:4620-4699` ne pose jamais `executeParId` (miroir `demo-store.js:4531-4610`) ; `exports.js:256` sort `nomDe(mv.executeParId)`. **Tiré**, ligne réelle du `mouvements.csv` scellé : `…;VALIDE;FORM-2026-0002;MVT-…;Erreur de saisie…;;;` — trois colonnes finales vides. **Nuance** : la colonne **Technicien** n'est PAS vide, `exports.js:243-244` retombe sur `validateurId` quand `contreEcritureDe` est posé. Le dossier n'est donc pas muet sur l'auteur : il est **incohérent** — un nom dans une colonne, rien dans celle qui porte le titre |
| 7 | `hashPdfFinal = null` → le document est TOUJOURS régénéré | **CONFIRMÉ** | `api.js:4696` ; `conserve.js:30-39` (`doitServirPdfConserve` exige `hashPdfFinal`) et son commentaire nomme déjà les contre-écritures. **Tiré T-B** : `doitServirPdfConserve(originale) = true`, `doitServirPdfConserve(contre) = false`. Conséquence non dite par la relecture : la contre-écriture **n'apparaît pas non plus** dans `02-PDF-CONSERVES.txt` — elle n'est ni conservée ni **dénoncée**, elle est silencieusement recalculée |
| 8 | Tout ceci existe aujourd'hui, verrou FERMÉ, en FORMATION | **CONFIRMÉ** | T-A a tourné avec `VERROU_LIVRAISON = true`, sans aucune modification du dépôt |

### 1.2 Le chiffre qui résume le tout

Comparaison **champ par champ** de ce que `calculerChampsCerfa` produit pour
l'originale et pour sa contre-écriture — **36 champs texte + 35 cases à cocher = 71**,
plus le bouton radio du cadre 6 (identique dans les deux cas, `radio = 2`) :

| Mode | Champs différents | Lesquels |
|---|---|---|
| **FORMATION** | **4 sur 71** | `Fiche_no` · `14_Observations` (mention d'annulation sur l'ORIGINALE / filigrane Formation sur la contre) · `Sign_Operateur_Nom` · `Sign_Operateur_Qualite` |
| **OFFICIEL** | **5 sur 71** | `Fiche_no` · `14_Observations` · `Sign_Operateur_Qualite` · `Sign_Detenteur_Nom` · `Sign_Detenteur_Qualite` |

En OFFICIEL, `Sign_Operateur_Nom` est **identique** sur les deux fiches quand le
validateur est le signataire — le cas normal au lycée. Deux documents officiels,
numérotés à la suite, **indiscernables sur 66 champs sur 71**, dont la totalité du
cadre 11 (les masses). Et en OFFICIEL il n'y a **même pas** le filigrane
« MODE FORMATION » pour attirer l'œil.

### 1.3 La fabrique du numéro — le point central de l'arbitrage

**Il y a DEUX numéros, et ils portent aujourd'hui la même chaîne.**

- `numero` = **numéro d'écriture interne** du registre, produit par
  `prochainNumeroMouvement(mode)` (`api.js:6591-6602`, miroir `demo-store.js` via
  `prochainNumero`) : `FI-AAAA-NNNN` en Officiel, `FORM-AAAA-NNNN` en Formation,
  rang = `max + 1` sur **toute** la table `mouvements`. La contre-écriture consomme
  ce compteur exactement comme une fiche ordinaire (`api.js:4644`). Ce numéro entre
  dans l'empreinte **v1** (`hash-mouvement.js:29-36`) : il est **intouchable**, y
  compris pour l'avenir. **Tiré** : `FORM-2026-0001` puis `FORM-2026-0002`, même
  forme, `/^(FI|FORM)-\d{4}-\d{4}$/` vrai pour les deux.
- `cerfaNumero` = **le numéro de fiche du document réglementaire**, posé à la
  validation (`api.js:4472`) et, pour la contre-écriture, à sa création
  (`api.js:4681-4682`, miroir `demo-store.js:4586-4587`) : `type === 'TRANSFERT' ? null
  : numero`. Il entre dans l'empreinte **v2** (`hash-mouvement.js:43-48`).

**Donc : non, la relecture n'a pas confondu.** Ce n'est pas un numéro interne pris
pour un numéro de CERFA : le code pose littéralement `cerfaNumero` sur la
contre-écriture, et le générateur imprime cette fiche dans le champ `Fiche_no`
du formulaire officiel (`generateur.js:562`).

**Mais une précision de fabrication change le chiffrage.** `Fiche_no` est alimenté
par `ctx.numero`, c'est-à-dire `mouvement.numero` (`generateur.js:242`, `:562`) —
**pas** par `cerfaNumero`. Mettre `cerfaNumero` à `null` ne suffit donc **pas** à
faire taire le document : il faut **aussi** que le générateur refuse, comme il le
fait déjà pour le TRANSFERT (`generateur.js:235-241`).

**Et le précédent existe déjà, entier.** Le TRANSFERT est exactement le cas « écriture
du registre qui ne donne lieu à aucun CERFA » : `cerfaNumero = null`, refus du
générateur, exclusion du dossier d'audit (`dossier-audit.js:186-193`), boutons
retirés (`mouvements.js:78`, `fiche-bouteille.js:519`, `fiche-machine.js:610`),
exemption de PDF final (`pdf-final.js:59`). La branche (A) du § 3, c'est **étendre ce
précédent** ; elle n'invente aucun mécanisme.

### 1.4 Ce que la contre-écriture FIGE déjà — et ce qu'elle ne fige pas

| Figé, scellé, opposable | Où |
|---|---|
| Auteur : `technicien` = prénom+nom du validateur, `validateurId` | `api.js:4662-4664` |
| Date : `aujourdHui()` (jamais la date de l'originale) | `api.js:4645` |
| **Motif**, obligatoire, refus canonique si vide ou blanc | `api.js:4630-4632` |
| Lien vers l'annulée : `contreEcritureDe` | `api.js:4665` |
| PRP figé **à SA date** (les deux valeurs témoignent chacune de leur époque) | `api.js:4686-4687` |
| Empreinte **v2** chaînée, `versionEmpreinte = 2` | `api.js:4693-4699` |
| Entrée au **journal chaîné** : `CONTRE_ECRITURE`, cible = son numéro, détail = « Annule *N* · motif : … » | `api.js:4705-4707`. **Tiré**, présent au journal |
| L'originale : **statut seul** change, tout le reste identique (triggers WORM `schema.sql:341-378`) | `api.js:4703` |

| **Non** figé | Conséquence |
|---|---|
| `outilsFiges = []` (`api.js:4693`) | aucune balance, aucun détecteur au dossier de l'annulation |
| `hashSignatures` / `hashPiecesJointes` = empreinte de `[]` (`api.js:4694-4695`) | aucune signature, aucune pièce ne peut y être attachée |
| `hashPdfFinal = null` (`api.js:4696`) | point 7 : jamais de document conservé |
| `executeParId`, `superviseurId`, `responsableRegistreId` = null (absents de `api.js:4642-4679`) | point 6 |

### 1.5 Le motif, et qui peut contre-écrire

- **Motif : OBLIGATOIRE**, et en **TEXTE LIBRE**. Aucune liste, aucun code, aucune
  structure : `if (!motif || !String(motif).trim())` puis `String(motif).trim()`
  (`api.js:4630-4638`). Il est scellé dans l'empreinte v1
  (`hash-mouvement.js:35`), écrit au journal, exporté dans la colonne « Motif » de
  `mouvements.csv` (`exports.js:256`) — **et imprimé sur aucun document.**
- **Rôle : VALIDEUR** (`api.js:581` — référent, enseignant, administrateur ;
  `verifierValidateur`, `api.js:8688-8700` refuse un élève). Plus la condition 12,
  appliquée **dans tous les modes** : le validateur déclaré doit être la personne
  **connectée** (`api.js:4636`, `exigerValidateurDeSession`).
- **Fait décisif pour le § 3 : `annulerParContreEcriture` n'appelle PAS le moteur de
  blocage Officiel.** Aucun `evaluerBlocagesOfficiel`, aucun `cadreFicheOfficiel`
  entre `api.js:4620` et `:4712` — seuls `verifierValidateur` et
  `exigerValidateurDeSession`. Une contre-écriture ne franchit donc **aucune** des
  18 conditions bloquantes, ni aptitude, ni signature, ni PDF final. C'est un choix
  assumé du lot C (§ 9 : « attestation d'identité du validateur »), et c'est
  exactement ce que la branche (B) déferait.

### 1.6 Trouvé en plus (non signalé par la relecture)

1. **Le dossier d'audit contient le MÊME CERFA deux fois en FORMATION.** Tiré T-A :
   `cerfa/FORM-2026-0001.pdf` apparaît **deux fois** dans l'archive scellée. Cause :
   `dossier-audit.js:223-232` régénère le CERFA de chaque contrôle de l'année, et ne
   saute un contrôle LIÉ que si sa fiche a un **PDF conservé** (`:225-228`). En
   FORMATION il n'y en a jamais. Un inspecteur ouvrant l'archive T-A trouve donc
   **trois** fiches CERFA pour **deux** écritures, dont deux portant le même numéro.
   *Défaut distinct, hors périmètre du lot 1 — mais il aggrave le point 1 et il est
   à traiter.*
2. **Ni conservé, ni dénoncé.** Une contre-écriture OFFICIELLE n'apparaît pas dans
   `02-PDF-CONSERVES.txt` : elle sort du filtre `doitServirPdfConserve` sans laisser
   la moindre trace. La doctrine C3b (« une anomalie est DÉNONCÉE, jamais maquillée »)
   ne s'applique pas à elle **parce qu'elle n'est pas censée avoir de PDF**. C'est
   cohérent — et cela veut dire qu'aujourd'hui, en Officiel, une fiche du dossier
   scellé est recalculée à la volée **sans que le dossier le dise**.
3. **`superviseurId` et `responsableRegistreId` restent null eux aussi**, pas
   seulement `executeParId`.
4. **La date d'intervention `4_Date` sort VIDE** sur les deux fiches (tiré) : elle
   n'est alimentée que par le contrôle lié. La seule date visible du document reste
   donc celle des blocs de signature — celle du jour.

---

## 2. Ce qui ne dépend d'aucun arbitrage

Quelle que soit la doctrine retenue au § 3, **ces points sont faux** : ils
mentent sur des faits, pas sur un statut réglementaire.

### 2.1 Constat de ce qui est en cours (ne PAS replanifier)

Deux agents travaillent en parallèle, dans leurs propres arbres
(`claude/audit4-l1c1`, `claude/audit4-l1c2`). Constaté au moment d'écrire :

| Agent | Périmètre | État constaté |
|---|---|---|
| **l1c1** — `v8/js/cerfa/generateur.js` | points **2, 3, 4, 5** | Mention `MENTION_CONTRE_ECRITURE` en **tête** du cadre 14 avec le numéro de l'écriture annulée ; `PREFIXE_MOTIF_ANNULATION` imprime enfin le motif ; `PREFIXE_CAUSE_ANNULEE` requalifie la cause recopiée ; la quantité redevient **SIGNÉE** (la masse reste dans sa case — la règle « le doute ne retire jamais une masse » est respectée) ; blocs de signature **vidés** sur une contre-écriture, tracés retirés |
| **l1c2** — `server/api.js`, `demo-store.js`, `exports.js` + 4 suites | point **6** | `executeParId = validateur.id` posé à la création, des deux côtés (parité), identité prise de la **session** et non du corps ; `csvMouvements` exportée pour être éprouvée sur l'ANCIENNE forme (null) et la nouvelle |

Les deux respectent la parité `api.js` ↔ `demo-store.js` et ne touchent pas au passé
(`cerfaNumero` et `executeParId` sont dans l'empreinte **v2**, scellée à la création :
les contre-écritures déjà enregistrées gardent leur empreinte au bit près, et le
trigger WORM `schema.sql:348-353` interdit de toute façon d'y revenir).

### 2.2 Ce qu'ils n'ont pas couvert — signalé, pas replanifié

1. **Le piège pédagogique est traité, mais il crée une divergence qu'il faut nommer.**
   l1c1 conditionne le vidage des blocs à `!options.sansSignaturesReelles`, ce qui
   préserve `correction.js:495-496`. C'est le bon réflexe. **Mais** : le bouton
   « Correction élève » est offert sur une contre-écriture
   (`mouvements.js:80`, `fiche-machine.js:610-611`), et l'élève doit partir du **PDF
   vierge officiel** (`correction.js:506-510`). Résultat après le lot : sur une
   contre-écriture, la correction attend « Referent Lot1 / Titulaire attestation
   d'aptitude / 27/07/2026 » dans des cases que le document produit par le logiciel
   laisse **vides**. **Question ouverte** : corriger la copie d'un élève sur une
   *écriture d'annulation* a-t-il seulement un sens ? Si non, le bouton se retire
   (3 lignes), et la divergence disparaît. Ce n'est pas un défaut de l1c1 : c'est un
   choix qui n'appartient à aucun des deux agents.
2. **`superviseurId` / `responsableRegistreId`** restent null (§ 1.6-3) : l1c2 ne
   remplit qu'`executeParId`.
3. **Le doublon de CERFA en FORMATION** (§ 1.6-1) n'est traité par personne.
4. **Aucun des deux ne touche au point 1 ni au point 7** — c'est normal : ce sont
   précisément les deux points que l'arbitrage du § 3 tranche.

---

## 3. Les deux branches, chiffrées

### Ce qu'elles ont en commun

Aucune des deux ne peut **réécrire le passé** : le trigger WORM (`schema.sql:348-353`)
fige totalement une écriture ANNULE, et n'autorise sur une VALIDE que le seul passage
à ANNULE, tout le reste identique (`:355-378`). `numero` est dans l'empreinte v1,
`cerfaNumero` et `executeParId` dans la v2 : les deux branches valent **pour l'avenir
seulement**, sans migration de données et sans recalcul d'empreinte.

---

### Branche (A) — la contre-écriture est une ÉCRITURE INTERNE DE RÉGULARISATION

Pas de numéro de CERFA, pas de fiche CERFA, **un document de régularisation propre qui
désigne le CERFA initial**.

**Ce qu'elle change concrètement**

| Fichier | Geste | Modèle existant |
|---|---|---|
| `server/api.js:4681-4682` + `v8/js/data/demo-store.js:4586-4587` | `cerfaNumero = null` quand `contreEcritureDe` est posé (comme pour `TRANSFERT`) — **parité stricte** | ligne d'à côté |
| `v8/js/cerfa/generateur.js:235-241` | refus canonique d'un CERFA pour une contre-écriture, message dédié qui **renvoie vers le document de régularisation** | refus TRANSFERT, mot pour mot |
| `v8/js/documents/dossier-audit.js:191-193` | exclure les contre-écritures de la boucle CERFA ; y ajouter la **liste des régularisations de l'année** | filtre `!== 'TRANSFERT'` |
| `views/mouvements.js:78-81`, `fiche-machine.js:604-613`, `fiche-bouteille.js:519-522` | retirer « Visualiser CERFA » et « Correction élève » sur une contre-écriture ; poser à la place « Justificatif de régularisation » | même condition |
| **nouveau** `v8/js/documents/regularisation.js` | le document : numéro d'écriture interne, date, **auteur**, **motif en toutes lettres**, numéro **et** date du CERFA annulé, masse retirée **avec son signe**, machine, fluide, bouteille, empreinte de l'écriture. Aucun champ AcroForm, aucun formulaire officiel | `plaque-fgas.js`, `dossier-fuite.js` |
| suites | `test-contre-ecriture-document.mjs` (nouvelle) + `test-exports`, `test-contrat`, `test-officiel-e2e` (le § 4 du e2e attend aujourd'hui un CERFA) | — |

**Coût : M.** Six points de retouche qui recopient un patron déjà éprouvé, plus **un
document neuf à écrire de zéro** — c'est lui qui porte tout le coût, et il faut le
dessiner avant de le coder. Aucune migration, aucun changement de `VERSION_CONTRAT`
(la signature de `annulerParContreEcriture` ne bouge pas), aucune condition bloquante
nouvelle.

**Ce qu'elle implique pour les écritures DÉJÀ émises.** Les contre-écritures
existantes gardent leur `cerfaNumero` scellé. Elles continueraient donc de sortir un
CERFA — sauf à faire porter le refus par **`contreEcritureDe`** et non par
`cerfaNumero`, ce qui les couvre **toutes**, anciennes comprises, sans toucher une
seule donnée. C'est la variante à retenir : le passé ne se réécrit pas, mais il cesse
d'être **imprimé**. Effet de bord à assumer : le compteur « fiches numérotées » du
tableau de bord et du bilan (`dashboard.js:643`, `bilan.js:568-569`, tous deux basés
sur `cerfaNumero`) continuera de compter les anciennes contre-écritures. À corriger en
même temps ou à consigner.

**Risque.** Faible sur le code. Réel sur le **fond** : on retire de la circulation un
document que le logiciel produisait ; si le contrôleur, lui, attend une pièce
numérotée pour chaque mouvement du registre, on lui aura retiré la seule qu'il
reconnaisse. Voir l'objection ci-dessous.

**Ce qu'un inspecteur lit.** Un CERFA `FORM-2026-0001` marqué « écriture annulée par
contre-écriture », et **en face** un justificatif de régularisation qui nomme l'auteur,
la date, le motif en clair et la fiche annulée. Deux pièces qui **ne se ressemblent
pas** — c'est tout le point.

**⚠️ L'objection à peser honnêtement.** Un document de régularisation **sans numéro
réglementaire** suffit-il à justifier, devant un contrôle, l'écart entre deux états du
registre ? Trois faits, et une limite.
- Ce n'est pas un document **sans numéro** : il porte le numéro d'écriture interne
  (`FORM-2026-0002`), qui est dans l'empreinte chaînée et dans le journal — il est
  traçable et il est scellé.
- Le registre, lui, reste **complet** : `mouvements.csv` porte les deux lignes, la
  ligne annulée, la ligne annulante, le lien et le motif. L'écart entre deux états du
  registre est déjà justifié **par le registre**, pas par le CERFA.
- Le CERFA 15497*04 est une **fiche d'intervention sur un équipement**. Aucune
  intervention n'a eu lieu le jour de la contre-écriture. Émettre un CERFA pour un
  geste comptable, c'est attester une intervention qui n'a pas eu lieu.
- **La limite, et elle est réelle** : si un texte impose une fiche numérotée pour
  toute variation de masse au registre, (A) est insuffisante. **Nous ne savons pas ce
  que le texte exige, et nous ne le trancherons pas** (règle d'or n° 1). C'est
  précisément la question du § 4.

---

### Branche (B) — la contre-écriture est un DOCUMENT OFFICIEL CORRECTIF

Elle garde son numéro et suit **tout** le parcours : double signature, PDF final
conservé, pièces jointes, outils figés.

**Ce qu'elle change concrètement**

| Fichier | Geste |
|---|---|
| `server/api.js:4620-4712` + `demo-store.js:4531-4610` | **casser la méthode en deux** : `annulerParContreEcriture` ne crée plus une écriture VALIDE mais un **BROUILLON**, puis le parcours ordinaire soumission → signatures → validation avec PDF. `appliquerEffetsInverses` et le passage de l'originale à ANNULE **quittent** ce geste pour rejoindre `validerMouvement` |
| `v8/js/data/contrat.js:210-211` | sémantique changée → **`VERSION_CONTRAT` 13 → 14** ; `local-store.js`, `test-contrat` |
| `api.js:4178-4182` | `signerMouvement` refuse tout ce qui n'est pas BROUILLON : une contre-écriture BROUILLON devient un état neuf du registre, à border partout où l'on teste `statut` |
| `blocage-officiel.js` (les deux exemplaires) | la contre-écriture entre dans le moteur : conditions 6-7 (intervenant habilité), 11, 14-15 (signatures réelles), et le PDF final de `pdf-final.js:59` |
| `dossier-audit.js`, `conserve.js` | plus rien à faire : le PDF conservé s'applique de lui-même dès que `hashPdfFinal` existe |
| `views/mouvements.js` | la modale « Annuler par contre-écriture » ne conclut plus rien : elle ouvre un parcours |
| `generateur.js` | doit **quand même** faire tout le travail de (A) sur le fond : mention d'annulation, motif, quantité signée. **La branche (B) ne dispense d'aucune des corrections du § 2** |

**Coût : XL.** Ce n'est pas un lot de documents, c'est une **réécriture de la machine à
états du registre**, avec changement de version de contrat, aux deux magasins, plus la
reprise de `test-officiel-e2e` (dont la section 4 attend aujourd'hui une
contre-écriture scellée **sans** parcours de signatures),
`test-securite-negative` (lignes 961 et 1019), `test-validateur-session`,
`test-hash-mouvement`.

**Ce qu'elle implique pour les écritures DÉJÀ émises.** Elles restent ce qu'elles sont :
scellées, sans signature, sans PDF conservé. Le registre porterait alors **deux
régimes** de contre-écriture — les anciennes, non signées, et les nouvelles, signées —
sans qu'aucune marque ne distingue les premières. Il faudrait le dire quelque part, et
c'est un travail de plus.

**Risque : élevé, et pas seulement technique.**

**⚠️ Le point que la relecture n'a pas vu : (B) exige des signatures pour ANNULER une
erreur.** Aujourd'hui, contre-écrire est un geste **immédiat**, à la portée du
professeur seul, en une modale. Demain, il faudrait le détenteur. Trois conséquences,
et elles sont mesurables :

1. **Une erreur non annulable reste au registre.** Le détenteur indisponible, c'est la
   fausse masse qui reste — et elle reste **jusqu'à la déclaration annuelle**, qui
   retient toute écriture VALIDE **ou ANNULE** de l'année et **ne connaît pas la notion
   de mode** (`docs/POINTS-DE-FRICTION.md:104-106`). Une correction qui empêche de
   corriger est pire que le défaut.
2. **On durcirait le seul remède existant.** Le dépôt écrit lui-même que la
   contre-écriture est **la** parade aux masses de formation qui entrent dans la
   déclaration officielle — « une garantie de geste », qui « suppose que quelqu'un
   pense à la faire, à chaque fois » (`docs/POINTS-DE-FRICTION.md:108-114`). Ajouter
   deux signatures à un geste dont le problème connu est qu'on **l'oublie**, c'est
   garantir qu'on l'oubliera davantage.
3. **Il y a une fenêtre d'incohérence nouvelle.** Entre la création du brouillon et sa
   validation, les effets inverses ne sont pas appliqués : le stock reste faux et
   l'originale reste VALIDE. Aujourd'hui, l'annulation est **atomique**
   (`muter()`, `api.js:4638-4709`). (B) ouvre un intervalle qui n'existe pas.

**Ce qu'un inspecteur lit.** Deux CERFA numérotés à la suite, l'un annulé et l'autre
annulant, tous deux réellement signés, tous deux conservés bit à bit avec leur
empreinte. C'est **la réponse la plus forte** si le contrôleur attend une fiche
numérotée pour chaque variation de masse. Il faut le dire : sur ce terrain précis,
(B) est meilleure.

---

### Recommandation

**(A), et sans hésiter — mais après avoir posé la question du § 4.**

1. **(B) coûte XL, (A) coûte M, et (B) ne dispense d'aucune correction de (A).** Le
   fond du document — dire qu'il annule, dire quoi, dire pourquoi, ne pas inverser la
   masse, ne pas pré-remplir une signature — est à faire dans les deux cas. (B) ajoute
   par-dessus une réécriture de la machine à états.
2. **(B) attaque le remède avec l'arme du défaut.** Le dépôt documente déjà que la
   contre-écriture oubliée est le risque n° 1 sur ce terrain. Rendre l'annulation plus
   difficile, c'est aggraver le risque documenté pour améliorer une pièce.
3. **(A) n'invente rien.** Le TRANSFERT est le même cas, déjà tranché, déjà codé, déjà
   testé. On étend un précédent au lieu de créer un régime.
4. **(A) ne coupe pas la route à (B).** Si la question du § 4 revient « il faut une
   fiche numérotée », le justificatif de régularisation devient le brouillon de la
   fiche officielle et (B) se construit dessus. L'inverse n'est pas vrai : partir en
   (B) et revenir coûte tout le chemin fait.
5. **Le visa d'un organisme agréé est ABANDONNÉ depuis le 26/07/2026**
   (`docs/NOTE-DECISION-ETABLISSEMENT.md:126`, « Pourquoi il n'y a pas de visa
   d'organisme agréé »). **Personne ne viendra trancher.** Le
   propriétaire tranchera, et il doit pouvoir le faire en connaissance de cause : la
   seule chose que ce plan ne peut pas décider à sa place, c'est ce que le texte exige.

**En attendant sa réponse, on ne code ni (A) ni (B) : on code le § 2**, qui est vrai
dans les deux mondes.

---

## 4. La question à poser au propriétaire

> **Quand tu annules une écriture par contre-écriture, est-ce que ça doit sortir une
> deuxième fiche CERFA numérotée (comme une vraie intervention), ou juste un
> justificatif interne qui dit « la fiche n° X est annulée, voici pourquoi » ?**
>
> Ça change le travail du simple au quadruple, et ça change surtout ceci : avec une
> vraie fiche CERFA, il faudra **deux signatures pour annuler une erreur** — donc plus
> possible de corriger seul, tout de suite.

---

## 5. Ce qui reste gaté, et ce qui est livré sans attendre

### 5.1 GATÉ — n'entre dans aucune brique tant que le § 4 n'a pas de réponse

| Gate | Ce qui attend |
|---|---|
| **G1 — le numéro** | `cerfaNumero = null` sur une contre-écriture (`api.js:4681`, `demo-store.js:4586`) |
| **G2 — le document** | refus du générateur (`generateur.js:235-241`) et création du justificatif de régularisation |
| **G3 — le dossier scellé** | filtre de `dossier-audit.js:191-193` et pièce de remplacement |
| **G4 — les boutons** | `mouvements.js:78-81`, `fiche-machine.js:604-613`, `fiche-bouteille.js:519-522` |
| **G5 — le PDF conservé** | `hashPdfFinal` sur une contre-écriture (`api.js:4696`) : n'a de sens qu'en (B) |
| **G6 — « Correction élève » sur une contre-écriture** | § 2.2-1 : le bouton se retire ou la divergence se documente. Décision du propriétaire, pas des agents |

Aucun de ces gestes n'est engagé. `VERROU_LIVRAISON` reste **FERMÉ** et n'est touché
nulle part : la copie où il a été désarmé (§ 1.0, T-B) est une copie jetable hors du
dépôt, et le dépôt a été revérifié après coup (`v8/js/data/blocage-officiel.js:31` et
`server/blocage-officiel.js:24` : `true` tous les deux).

### 5.2 LIVRÉ SANS ATTENDRE — vrai quelle que soit la réponse

Les points **2, 3, 4, 5** (branche l1c1, `generateur.js`) et **6** (branche l1c2,
`api.js` / `demo-store.js` / `exports.js`), tels que constatés au § 2.1. Ils ne
préjugent de rien : que la contre-écriture garde ou perde son CERFA, le document ne
doit pas dire le contraire de l'écriture, et le dossier scellé ne doit pas laisser une
colonne vide là où l'information existe.

### 5.3 CONSIGNÉ, à traiter hors lot 1

1. **Doublon de CERFA dans le dossier d'audit en FORMATION** (§ 1.6-1,
   `dossier-audit.js:223-232`) — le même numéro deux fois dans une archive scellée.
2. **`superviseurId` / `responsableRegistreId` null** sur une contre-écriture.
3. **`4_Date` vide** sur toutes les fiches sans contrôle lié (§ 1.6-4).
4. **Compteurs « fiches numérotées »** (`dashboard.js:643`, `bilan.js:568-569`) : à
   revoir si (A) est retenue, sinon ils compteront des CERFA qui n'existent plus.

### 5.4 INCIDENT DE MÉTHODE, consigné parce qu'il doit l'être

Pendant la préparation du tirage T-C, `node server/creer-admin.js` a été lancé **sans**
`IWF_CHEMIN_BASE` : la commande a **créé une base neuve** dans `data/` du dépôt (schéma
+ 35 migrations + un compte ADMIN, **0 mouvement, 0 personnel, 0 machine** — vérifié
par comptage avant de rien faire). Le fichier a été **déplacé, pas supprimé**, vers
`…/scratchpad/base-creee-par-erreur/inerweb-fluide.db`, et `data/` a retrouvé l'état
où il a été trouvé (vide, `git status` propre). Aucune donnée n'a été touchée — il n'y
en avait aucune. **La règle reste la règle** : `IWF_CHEMIN_BASE` sur *toute* commande
qui ouvre une base, y compris les CLI d'amorçage. Le tirage T-C a ensuite été rejoué
correctement, base jetable sous `Temp\iwf2301`.

---

## 6. Contre-épreuves à tirer (obligatoire avant tout commit de code)

Rappel pour les briques du § 2 et, le jour venu, pour la branche retenue. Chaque
brique doit produire **les deux sorties** :

| Brique | Test ROUGE si l'on retire le correctif | VERT quand on le remet |
|---|---|---|
| Point 2 (quantité) | contre-écriture de −0,50 kg → `11_QA` attendu `"-0,50"` ; le retour à `Math.abs` doit faire ÉCHOUER | `calculerChampsCerfa` sur les deux fiches |
| Point 3 (mention) | absence de `MENTION_CONTRE_ECRITURE` dans `14_Observations` d'une contre-écriture = échec | idem |
| Point 4 (signatures) | `Sign_*` non vides sur une contre-écriture = échec ; **et** `Sign_*` **vides** sous `sansSignaturesReelles: true` = échec (le piège pédagogique se prouve dans les DEUX sens) | `correction.js` inchangé |
| Point 5 (motif) | motif absent du document = échec | idem |
| Point 6 (`executeParId`) | colonne « Exécuté par » vide sur une contre-écriture NEUVE = échec ; **et** colonne vide sur une contre-écriture ANCIENNE (`executeParId: null`) = attendu, ne doit PAS échouer | `csvMouvements` appelée directement |
| Toutes | `test-contrat` (démo **et** local), `test-hash-mouvement`, `test-exports`, `test-signatures-mouvement` | — |

**Ne pas jouer le filet complet** : plusieurs agents travaillent en parallèle, les
ports se marcheraient dessus. Suites nommément désignées seulement ; l'orchestrateur
jouera `node outils/lancer-tests.mjs --tout` une seule fois, à la fin.
