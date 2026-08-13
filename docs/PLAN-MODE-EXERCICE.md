# Plan — MODE EXERCICE (bac à sable pédagogique sur données réelles)

> Demande de Franck (13/08/2026) : former des techniciens SUR le logiciel — CERFA de
> démonstration, exercices, manipulations — sans rien écrire au registre certifié
> conforme, mais en partant des valeurs RÉELLES du parc. Direction validée le 13/08,
> production lancée le même jour (« on peut lancer la production »).
>
> Faisabilité TIRÉE avant conception : une photo (export JSON complet) d'un registre
> réel s'importe dans le bac à sable du navigateur, chaîne d'empreintes verte, balance
> propre au bac, registre réel étanche. L'architecture existante (deux stores, un seul
> contrat) porte déjà 80 % de la fonction.

## Les trois décisions de Franck (13/08, verbatim consigné)

1. **La photo = le réel, en entier** (« on garde le réel ») : l'export JSON complet
   existant, sans variante expurgée. Conséquence assumée : le bac à sable du navigateur
   contient du nominatif — d'où l'effacement TOTAL (décision 3) et le journal chaîné qui
   trace chaque tirage de photo. Le poste de cours est sous la responsabilité du
   formateur.
2. **La clé = un code de déblocage dédié** (« celui qui a le code ») : pas une garde de
   rôle seule — une FONCTION à code. Le code est défini par ADMIN/REFERENT, haché
   (patron scrypt de `comptes.js`), stocké dans `parametres`. Le démarrage d'un
   exercice exige une session (n'importe quel rôle) ET le code.
3. **Effacement total + sauvegarde des exercices** : un geste « Terminer » détruit TOUT
   le bac (données d'exercice, photo d'origine, drapeau) — « toute trace a été
   détruite » ; jusqu'à cet effacement, l'exercice PERSISTE entre les sessions du
   navigateur, et il se SAUVEGARDE en fichier (export JSON du bac, déjà au contrat) et
   se recharge. ⚠️ Limite dite honnêtement : le logiciel efface SON bac ; un fichier
   d'exercice téléchargé par l'utilisateur vit sur le disque, hors de sa portée.

## Ce qui existe déjà (rien à coder)

- Le bac à sable : DemoStore, persistance localStorage (`inerweb-fluide-v8-demo`),
  effaçable, réinitialisable ; CERFA imprimables avec filigrane « DÉMO / FORMATION »
  (aucun document d'apparence officielle ne peut en sortir).
- `exporterJSON` / `importerJSON` au contrat, des deux côtés — la photo, la sauvegarde
  d'exercice et sa reprise passent par ce canal éprouvé (invariants, gardes L2).
- L'écran Sauvegarde expose déjà l'export/import JSON (`views/sauvegarde.js`).

## Briques

- **E1 — serveur `routes-exercice.js`** (patron `routes-sauvegarde.js`, HORS contrat) :
  `etatExercice` (le code est-il défini ?) · `definirCodeExercice { code }` — garde
  ADMIN/REFERENT, ≥ 4 caractères, haché scrypt, journal `DEFINITION_CODE_EXERCICE`
  (jamais le code) · `demarrerExercice { code }` — session requise + code vérifié en
  temps constant → rend la photo (export complet) + journal `DEMARRAGE_EXERCICE` (qui,
  quand). Anti-force-brute = le coût scrypt par essai (consigné : pas de verrouillage
  dédié — le code n'ouvre que le bac, et le journal trace).
- **E2 — front `v8/js/data/mode-exercice.js`** (stockage injectable, testable pur) :
  drapeau `iwf-exercice`, photo d'origine + date sous leur clé, `activer(photo)`,
  `aSemer()`, `reinitialiser()` (re-semer la photo d'origine),
  `terminerEtToutEffacer()` (drapeau + photo + clé du bac → néant). `datastore.js` :
  drapeau posé → DemoStore MÊME si le serveur répond ; premier chargement → semis par
  `importerJSON(photo)` (canal officiel, invariants joués).
- **E3 — UI** : carte « Mode exercice » dans l'écran Sauvegarde (définir le code,
  démarrer avec le code) ; en mode bac, BANDEAU permanent « MODE EXERCICE — données
  réelles du [date] — rien ne s'écrit au registre » avec Sauvegarder l'exercice
  (télécharge le JSON du bac) · Réinitialiser (re-semer la photo) · Terminer et TOUT
  effacer (double confirmation « toute trace sera détruite »).
- **E4 — preuves** : `server/test-routes-exercice.mjs` (gardes de rôle, code bon/faux,
  photo rendue, journal) · `v8/js/data/test-mode-exercice.mjs` (cycle drapeau → semis →
  étanchéité → effacement total, stockage factice) · contre-épreuves tirées ·
  vérification navigateur du bandeau et du cycle complet.

## Ce que ce plan NE change PAS

Le registre réel (aucune écriture, aucun schéma, aucune migration) · le monde Démo
public (GitHub Pages, semis fictif inchangé) · le verrou du mode Officiel · le contrat
DataStore (les routes exercice vivent HORS contrat, comme la sauvegarde).
