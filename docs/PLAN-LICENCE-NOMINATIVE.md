# PLAN — Licence d'évaluation nominative (distribution contrôlée)

> Décisions du propriétaire prises le 14/08/2026 (session « paquet bêta ») :
> **(a)** fermer les releases publiques v1.0.0/v1.0.1, garder la vitrine GitHub Pages,
> licence des versions futures = « code visible, redistribution interdite » ;
> **(b)** mode Officiel FERMÉ dans les paquets d'évaluation (protection du propriétaire :
> aucun testeur ne produit de registre à valeur légale sur une version d'évaluation) ;
> **(c)** adresse de contact = inerweb.fh@gmail.com.

## Le but, en une phrase

Le paquet complet ne s'obtient plus que NOMINATIVEMENT : chaque copie porte le nom de
son destinataire, une licence signée numériquement la déverrouille, et une copie qui
fuite désigne son origine.

## Ce que le dispositif prétend, et ce qu'il ne prétend PAS

- Il rend le partage **traçable** (numéro + nom visibles, registre des livraisons,
  empreinte SHA-256 propre à chaque zip) et **juridiquement sans ambiguïté**
  (redistribution interdite par la licence, falsification = signature cassée,
  contournement = modification délibérée du code).
- Il ne rend PAS la copie techniquement impossible : le code s'exécute chez
  l'utilisateur, donc se lit, donc se modifie (doctrine du 14/07/2026 — jamais
  d'obfuscation). Reculer l'horloge du poste repousse l'expiration : limite CONNUE,
  assumée, non combattue.
- **Aucun appel réseau** : la vérification est entièrement locale (signature Ed25519,
  clé publique embarquée). La promesse « rien ne part sur internet » tient ;
  `test-promesses-cloud` reste le juge.

## Architecture

### Le fichier de licence : `licence-inerweb.json` (racine du paquet)

Champs : `produit`, `cle` (n° de la clé de signature, 1), `numero` (EVAL-2026-NNN),
`titulaire`, `courriel`, `delivreLe`, `expireLe` (AAAA-MM-JJ), `portee`
(`EVALUATION`), `signature` (Ed25519, base64). La chaîne signée est canonique
(champs dans un ordre FIXE, séparés par des sauts de ligne — patron
`chaineCanoniqueSignature` de hash-mouvement.js). La clé PRIVÉE vit chez le
propriétaire, HORS dépôt (le dépôt est public) : `C:\git\paquets\licences\`.
La perdre = ne plus pouvoir délivrer (les licences déjà émises restent valides) ;
la sauvegarder hors ligne (clé USB, impression).

### `server/licence.js` (CommonJS)

- `CLE_PUBLIQUE_LICENCE` (PEM SPKI, embarquée) ; les tests INJECTENT leur propre
  paire jetable (`{ clePublique }` en option) — la clé privée réelle ne touche
  jamais le filet.
- `verifierLicence(objet, aujourdHui, options)` → `{ ok, motif, licence }`.
  Motifs canoniques : `ABSENTE`, `ILLISIBLE`, `CHAMP_MANQUANT`,
  `SIGNATURE_INVALIDE`, `EXPIREE`. Les dates passent par `server/dates.js`
  (défaut-refus : une date illisible ne s'interprète JAMAIS).
- `evaluerDemarrageLicence({ racine, env, aujourdHui, options })` → décision PURE :
  `{ demarrer, lectureSeule, message }`. C'est ELLE que la suite tire, pas le serveur.

### Quand la licence est-elle EXIGÉE ?

Un paquet portable se reconnaît à `node\node.exe` à côté du serveur — c'est sa
signature de fabrication. Enforcement si `node\node.exe` présent OU
`IWF_LICENCE_REQUISE=1` (pour le tirer en test). Conséquences :
- le dépôt de développement (pas de `node\`) démarre comme avant — le filet,
  l'installation réelle du propriétaire (qui tourne depuis le dépôt) et la démo
  GitHub Pages (aucun serveur) sont INTACTS ;
- toute copie du paquet exige une licence valide, où qu'elle soit recopiée ;
- supprimer `node\node.exe` pour esquiver = le paquet ne démarre plus sans
  installer Node soi-même, et c'est un contournement délibéré (terrain juridique).

### Comportements (jamais de registre en otage)

| État | Effet |
|---|---|
| Licence valide | Démarre. Fenêtre noire : « Licence n° X — délivrée à Y — expire le Z ». |
| Absente / signature invalide / illisible | REFUS de démarrer, message + contact inerweb.fh@gmail.com. |
| Expirée | Démarre en LECTURE SEULE : consultations, exports, sauvegardes ouverts ; toute méthode de `ROLES_MUTATION` répond 403 avec message canonique. Le registre reste consultable et exportable À VIE. |

Refus des mutations dans `serveur.js` (il connaît la méthode appelée ;
`api.js` exporte `ROLES_MUTATION`), AVANT l'aiguillage — patron des gardes réseau.

### Outillage (chez le propriétaire, jamais dans le paquet)

- `outils/generer-cles-licence.mjs` — une fois : paire Ed25519, privée →
  `C:\git\paquets\licences\cle-privee-licence.pem`, publique → à coller dans
  `server/licence.js`. Refuse d'écraser une clé existante.
- `outils/delivrer-licence.mjs "Nom" courriel [--mois 6]` — numérote
  (EVAL-2026-NNN, compteur lu du registre), signe, écrit
  `licences/EVAL-2026-NNN-licence-inerweb.json`, consigne au registre
  `licences/registre-livraisons.csv` (numéro ; titulaire ; courriel ; délivrée ;
  expire ; empreinte du zip quand il est fabriqué). Registre NOMINATIF → reste
  local chez le propriétaire (RGPD : consentement par la demande elle-même).
- `outils/fabriquer-paquet.mjs --licence <chemin>` — la licence devient
  OBLIGATOIRE pour fabriquer (aucun paquet déverrouillé par accident) ; embarque
  `licence-inerweb.json` + `LICENCE-EVALUATION.txt` (à la place du LICENSE
  PolyForm) ; zip nommé du numéro (`inerWeb-Fluide-EVAL-2026-NNN.zip`) ;
  empreinte SHA-256 reportée au registre.

### Textes

- **`LICENSE` (dépôt, versions futures)** : français, « code visible » — lecture,
  audit et étude libres ; USAGE soumis à licence nominative gratuite pour
  l'enseignement (sur demande), payante pour le commerce ; REDISTRIBUTION
  INTERDITE sans accord écrit. Les copies reçues sous PolyForm NC (jusqu'à la
  v1.0.1 du 15/07/2026) gardent les droits de CETTE licence : la date fait la
  frontière, on ne réécrit pas le passé.
- **`LICENCE-EVALUATION.txt` (paquet)** : contrat d'évaluation en français simple —
  nominative, non cessible, redistribution interdite, durée avec date, documents
  non opposables (mode Formation), retours attendus, aucune garantie.
- **Vitrine `index.html`** : la section Télécharger devient « paquet sur demande
  nominative » (le bouton release v1.0.1 mourra avec la release).
  ⚠️ `index.html`, `guide.html` et tous les `.md` racine sont jugés par
  `test-mots-qui-promettent` : vocabulaire mesuré.

### GitHub (lot hors code, APRÈS la vitrine poussée)

1. Pousser main (vitrine + LICENSE + code licence).
2. Supprimer les releases v1.0.0 et v1.0.1 (les tags restent : antériorité).
3. Limite CONNUE : le dépôt public laisse le CODE téléchargeable (Code → ZIP,
   c'est la nature d'un dépôt public et le prix de la vitrine + antériorité).
   Ce zip n'embarque pas Node, et la nouvelle LICENSE en interdit l'usage sans
   licence nominative et la redistribution. Décision (a) assumée.

## Ordre des lots

- **LN-1** `server/licence.js` + hook `serveur.js` + export `ROLES_MUTATION` +
  suite `server/test-licence.mjs` (contre-épreuve : retirer la vérification → rouge).
- **LN-2** outillage (clés, délivrance, fabrication) + `LICENCE-EVALUATION.txt`.
- **LN-3** LICENSE + vitrine + INSTALLATION_SIMPLE.md / LISEZ-MOI.
- **LN-4** hors code : push, suppression des releases, premier paquet nominatif
  prouvé sur banc (sans licence → refus ; avec → démarre ; expirée → lecture seule).

Un lot = un commit, TOUT VERT avant chaque commit (139 exécutions au 14/08 —
le compte croît avec la nouvelle suite).
