# P0-9 — Révocation des clés API v7 : constat, procédure et procès-verbal

> Constat technique établi le **23/07/2026** sur le dépôt `C:\git\inerweb-fluide`.
> Ce document est la pièce qui **clôt** le constat P0-9 de l'audit externe du 20/07/2026
> (« révocation non prouvée par l'archive »). Il se termine par un procès-verbal à dater
> et signer par Franck Henninot : c'est lui, et lui seul, qui vaut preuve.
>
> ⚠️ Les valeurs des clés ne figurent NULLE PART dans ce document. Chaque clé y est
> identifiée par l'empreinte SHA-256 de sa valeur : cela suffit à prouver *de quelle
> clé on parle* sans la republier une fois de plus.

---

## 1. Ce qui a été vérifié (et comment)

Tout ce qui suit a été **tiré**, pas lu : commandes `git` jouées sur le dépôt réel.

| Question | Réponse établie |
|---|---|
| Les clés sont-elles encore dans le code courant ? | **Non.** `apps-script/Code.gs` et `Code_API_v7.1.0.gs` lisent les clés depuis les Script Properties (`getApiKey_`). La fonction `setClesAPI_temp()`, qui les réinjectait en dur, a été **supprimée** et remplacée par `genererClesAPI()` (génération aléatoire, affichage unique). |
| Sont-elles encore dans l'historique git ? | **Oui.** Retirées du code par le commit `77b9640` du **02/07/2026 17:18**, elles restent lisibles dans toutes les versions antérieures des fichiers. |
| Depuis quand ? | Premier commit porteur : `f36d727` du **08/03/2026 08:38**. |
| Le dépôt est-il public ? | **OUI — `frigorx/-inerweb-fluid-cerfa-fi-bsd-4` est PUBLIC** (créé le 07/03/2026, 309 commits). |
| Quels fichiers portent encore les clés dans l'historique ? | `apps-script/Code.gs`, `Code_API_v7.1.0.gs`, **et `CHANGELOG.md`** (souvent oublié lors des purges). |
| Ces commits sont-ils réellement publiés (et pas seulement locaux) ? | **Oui.** Les cinq commits porteurs sont présents sur `origin/main` — et sur **sept références distantes** au total (`main` + six branches de travail non supprimées). |

### La conséquence, dite sans détour

Les trois clés ont été exposées publiquement pendant **116 jours** (du 08/03 au 02/07/2026),
et — c'est le point qui compte — **elles le sont encore aujourd'hui** : le dépôt est public,
l'historique est public, et retirer une valeur du code courant ne la retire pas du passé de git.

Tant que les trois clés n'ont pas été **régénérées côté Google**, n'importe qui ayant consulté
le dépôt ou l'un de ses clones peut, avec la clé correspondante :

- **lire** l'intégralité du classeur Google Sheets v7 (clé READ) ;
- **écrire ou modifier** des données (clé WRITE) ;
- **purger ou administrer** le classeur (clé ADMIN).

Le correctif du 02/07 était nécessaire mais **il ne clôt rien à lui seul**. Seule la
régénération ferme la porte.

---

## 2. Identification des trois clés (sans divulgation)

Chaque clé fait 32 caractères. Son empreinte permet, plus tard, de prouver qu'on parle bien
de la clé révoquée — y compris devant un auditeur — sans l'exposer une nouvelle fois.

| Propriété | Longueur | Empreinte SHA-256 de la valeur exposée |
|---|---|---|
| `API_KEY_READ` | 32 | `2c368c1fa22f804e733a4a76624d07b31e0449b9e0c0b53cab8d35f099248c4e` |
| `API_KEY_WRITE` | 32 | `9877c41b09584957e24e69fab975cbeb49e87bb29ec48f81578d2fdd68f4f9a5` |
| `API_KEY_ADMIN` | 32 | `919bf2ab57aee62495e354b4683492bb52714a654b901a00f3a47f56bc4f762a` |

*Méthode : valeurs extraites de `git show 77b9640^:apps-script/Code.gs`, hachées en SHA-256,
jamais écrites sur disque en clair.*

---

## 3. Procédure de révocation — pas à pas

À faire par Franck Henninot, depuis son compte Google. **Environ 15 minutes.**

1. **Ouvrir le classeur Google Sheets** qui sert de base de données v7.
2. Menu **Extensions → Apps Script**.
3. Vérifier que le code affiché est la **version corrigée** : chercher `genererClesAPI` ;
   la fonction `setClesAPI_temp` ne doit **pas** exister. Si elle existe encore, c'est que
   le script en ligne est resté à une version antérieure au 02/07 — dans ce cas, coller
   d'abord le contenu de `apps-script/Code.gs` du dépôt.
4. Dans la liste déroulante de la barre d'outils, sélectionner **`genererClesAPI`**, puis
   **Exécuter**. Trois nouvelles clés aléatoires s'affichent.
5. **Noter les trois nouvelles clés dans un gestionnaire de mots de passe.** Jamais dans le
   dépôt, jamais dans un fichier suivi par git, jamais dans une capture d'écran.
6. Menu **Déployer → Gérer les déploiements** : modifier le déploiement existant en
   sélectionnant une **nouvelle version**. **Étape indispensable** — sans nouvelle version,
   l'ancien code continue d'être servi avec les anciennes clés, et la révocation est nulle.
7. **Prouver la révocation** (c'est ce que l'auditeur demandera) : rejouer un appel à
   l'API avec **chacune des trois anciennes clés** et constater un **échec**. Conserver la
   capture ou la réponse d'erreur. Sans ce test, la révocation est affirmée, pas prouvée.

### La question qui reste ouverte : que fait-on de l'historique public ?

La régénération suffit à **fermer le risque** : une clé révoquée qui traîne dans un historique
public n'ouvre plus rien. Purger l'historique est donc **facultatif**. Trois options, à
trancher par Franck :

| Option | Ce que ça donne | Mon avis |
|---|---|---|
| **A. Régénérer seulement** | Le risque est clos. Les anciennes valeurs restent visibles dans l'historique public, mais inertes. | **Recommandé.** Suffisant, sans risque, et parfaitement défendable en audit dès lors que le présent PV existe. |
| **B. Régénérer + passer le dépôt en privé** | Idem, et l'historique n'est plus consultable. | Raisonnable si la publication du dépôt n'a pas d'autre utilité. À ne pas confondre avec une révocation — le passage en privé ne révoque rien et ne rattrape pas les clones déjà faits. |
| **C. Régénérer + réécrire l'historique** | Les valeurs disparaissent du dépôt. | **Déconseillé.** Réécrire 309 commits casse l'antériorité git qui sert de preuve de paternité du logiciel, et les clones existants gardent l'ancien historique de toute façon. On paierait cher un gain nul. **Et le travail est plus lourd qu'il n'y paraît** : les commits porteurs sont sur **sept références distantes**, pas seulement `main` — une purge qui n'en traiterait qu'une laisserait les clés lisibles sur les six autres. |

---

## 4. Procès-verbal de révocation — à dater et signer

> À remplir **après** avoir exécuté la procédure du §3. Ce document rempli, daté et signé
> est la pièce à verser au dossier d'audit. Il répond au constat P0-9.

**Objet :** révocation des trois clés API du backend Apps Script v7 d'inerWeb Fluide,
exposées publiquement du 08/03/2026 au 02/07/2026 dans le dépôt
`github.com/frigorx/-inerweb-fluid-cerfa-fi-bsd-4`.

**Établissement :** Lycée professionnel Jacques Raynaud, Marseille.
**Responsable de l'opération :** Franck Henninot.

| Élément | À renseigner |
|---|---|
| Date et heure de la régénération | ............................................ |
| Fonction utilisée | `genererClesAPI` (génération aléatoire, Script Properties) |
| Nouveau déploiement publié (nouvelle version) | ☐ oui — n° de version : .................. |
| Ancienne clé READ (empreinte `2c368c1f…248c4e`) — appel de test | ☐ **rejeté** ☐ accepté |
| Ancienne clé WRITE (empreinte `9877c41b…f4f9a5`) — appel de test | ☐ **rejeté** ☐ accepté |
| Ancienne clé ADMIN (empreinte `919bf2ab…4f762a`) — appel de test | ☐ **rejeté** ☐ accepté |
| Nouvelles clés conservées dans | ☐ gestionnaire de mots de passe ☐ autre : ............ |
| Sort de l'historique public (§3) | ☐ A. régénérer seulement ☐ B. + dépôt privé ☐ C. + réécriture |
| Preuve conservée (capture des trois refus) | ☐ oui — emplacement : ........................ |

**Constat porté par le signataire :** les trois clés listées ci-dessus ne donnent plus accès
au backend v7. Aucune donnée du classeur n'est accessible par leur intermédiaire.

Date : ............................  Signature : ............................

### Une fois signé

1. Ranger le PV avec les preuves (captures des trois refus).
2. Mettre à jour `SECURITE.md` : remplacer « procédure à faire immédiatement » par
   « incident CLOS le <date>, voir `docs/P0-9-REVOCATION-CLES-V7.md` ».
3. Me le dire : je porte la clôture au CHANGELOG et au `PROMPT-REPRISE.md`, et P0-9 sort
   de la liste des points ouverts. **Les neuf P0 seront alors soldés.**

---

## 5. Ce qui n'a PAS été fait ici, et pourquoi

- **La révocation elle-même n'a pas été exécutée** : elle exige la connexion au compte Google
  de Franck. Un assistant ne se connecte pas à un compte à la place de son titulaire, même
  avec les identifiants — la preuve d'une révocation ne vaut que si elle émane de celui qui
  en répond.
- **L'historique git n'a pas été réécrit** : c'est une décision (§3), pas une tâche, et elle
  détruirait l'antériorité qui sert de preuve de paternité.
- **`apps-script/.clasp.json` contient un identifiant réel de projet Apps Script**
  (relevé par l'audit du 20/07, §« secrets »). Ce n'est **pas** une clé d'accès et cela
  n'ouvre rien, mais c'est un artefact de déploiement qui n'a rien à faire dans un dépôt
  public. Retrait proposé — hors périmètre P0-9, à faire à l'occasion.
