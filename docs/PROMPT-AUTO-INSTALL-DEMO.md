# Prompt de démarrage — « AUTO-INSTALL DÉMO » : la vitrine, le guide et le paquet

> Copier tout ce qui suit comme PREMIER message d'un nouveau chat.
> Décision de Franck (14/07/2026) : le logiciel est **fini et figé**. Ce chantier n'ajoute
> **aucune fonctionnalité** — c'est de l'**emballage** : une page qui présente, un guide qui
> explique, un paquet qui s'installe tout seul. Zéro risque pour le produit.

---

Tu prépares la **diffusion** d'**inerWeb Fluide** (`C:\git\inerweb-fluide`), logiciel local de
traçabilité des fluides frigorigènes (F-Gas / CERFA 15497*04), écrit par un enseignant de lycée
professionnel pour ses élèves et son atelier, et destiné à être **donné aux lycées**.

Le logiciel est **opérationnel, testé (71 exécutions vertes), et son code est propre**. Il n'y a
rien à corriger. Ta mission est de le rendre **installable et compréhensible par un collègue qui
n'y connaît rien**.

## L'OBJECTIF, DIT PAR FRANCK

> « Créer **le mode d'emploi complet avec des captures d'écran**, qui servira **à la fois de page
> de démonstration sur GitHub et de lien pour télécharger le logiciel**. Dans le mode
> démonstration, on aura aussi **un mode guide d'installation** avec des captures d'écran. »

Autrement dit **UNE seule page publique**, qui fait trois choses :
1. elle **montre** le logiciel (vitrine : ce qu'il fait, pour qui, ce qu'il a de plus) ;
2. elle **l'explique** (mode d'emploi complet, écran par écran, captures à l'appui, y compris le
   **guide d'installation** illustré) ;
3. elle **le donne** (bouton de téléchargement + empreinte SHA-256 + lien vers la démo en ligne).

Franck a précisé : « avec un **menu / sous-menu** qui explique d'abord les grandes lignes, puis tous
les **cheminements**, et **tous les points de blocage** ». Et, si c'est possible, **du vocal**.

## À LIRE D'ABORD (et à ne pas re-découvrir)

- `docs/CARTE-CODE.md` — l'architecture en une page. **Avant toute exploration.**
- Tête de `CHANGELOG.md` — l'état exact, dernier incrément en tête.
- `docs/AUDIT-QUALITE-2026-07.md` — l'audit du 14/07 (ce qui est sain, ce qui reste en dette).
- `git log` + `git status` à la reprise (des sessions parallèles sont possibles).

## CE QUI EXISTE DÉJÀ — NE LE REFAIS PAS

C'est le piège n° 1 de ce chantier : **l'auto-installeur est déjà écrit.**

- **`outils/fabriquer-paquet.mjs`** assemble un **paquet portable autonome** : il embarque
  `node.exe`, exclut les tests, la doc interne et l'ancienne v7, copie `LICENSE` +
  `LICENCES-TIERCES.md`, écrit un `LISEZ-MOI.txt`, produit un **ZIP compressé** (`--zip`,
  **35,4 Mo** — éprouvé : extrait par le lecteur natif de Windows, `node.exe` extrait démarre) et
  calcule son **empreinte SHA-256** (fichier `.zip.sha256` + commande de vérification affichée).
  ⚠️ Sa compression lui est PROPRE : `server/zip-node.js` (miroir de `v8/js/core/zip.js`) reste en
  « stored », car les **dossiers d'audit scellés** et leur vérificateur autonome en dépendent —
  **ne jamais y toucher pour un besoin d'emballage**.
- **`lancer-inerweb.bat`** cherche d'abord le Node **embarqué**, se rabat sur celui du poste,
  et affiche un message clair s'il n'y en a aucun. Il crée `data/`, `documents/`, `backups/`,
  ouvre le navigateur, puis démarre le serveur.
- **Au tout premier lancement**, l'application affiche directement à l'écran « créer le compte
  administrateur » — plus aucune saisie dans la fenêtre noire.
- **La démo en ligne** tourne déjà : `https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/`
  (dépôt **public**, GitHub Pages depuis `main` / racine).
- **`index.html` à la racine** est aujourd'hui une simple **redirection** vers `/v8/`.
  ⚠️ Le serveur local, lui, redirige `/` vers `/v8/` **dans son code** (`serveur.js`) : la page
  d'accueil du site n'apparaît donc JAMAIS chez l'utilisateur local, et le paquet portable ne la
  contient pas. **Tu peux donc en faire une vraie page de présentation sans rien casser.**

**Pourquoi un paquet portable et PAS un `.exe` d'installation** (décision arrêtée, ne pas la
rouvrir) : dans un lycée, les postes sont souvent **sans droits administrateur** — un installeur
échouerait ; un `.exe` non signé déclenche l'écran rouge SmartScreen « éditeur inconnu » (un
certificat coûte 300-500 €/an) ; les antivirus scolaires se méfient des installeurs. Le portable
marche sans droits, tient sur une clé USB, et se désinstalle en jetant le dossier.

## LE CHANTIER — 4 briques, une brique = un commit

### Brique 1 — Publier le paquet (la plus courte, fais-la en premier)

`node outils/fabriquer-paquet.mjs --zip`, puis publier le ZIP en **Release GitHub** (le dépôt est
public), **avec son empreinte SHA-256 affichée à côté du lien** (l'outil te la donne, et donne la
commande de vérification `certutil` pour l'utilisateur). Le bouton « Télécharger » de la page
pointera sur cette release.
Vérifier que le ZIP **téléchargé**, décompressé sur un dossier vierge, **démarre d'un double-clic**
— test réel, pas supposé.
⚠️ Windows marque les fichiers venus d'Internet : documenter, captures à l'appui, le clic droit →
Propriétés → **Débloquer** si le `.bat` est bloqué.

### Brique 2 — La page d'accueil : vitrine + téléchargement

`index.html` (racine) devient la **page publique** : ce que le logiciel fait, pour qui, ce qu'il a
que les autres n'ont pas (registre inaltérable à hash chaîné, dossier de fuite fermé, dossier
d'audit scellé avec son vérificateur autonome, mode formation, correction automatique du CERFA
élève, 100 % local, gratuit pour les lycées), le bouton **Télécharger**, le lien vers la **démo en
ligne**, et le lien vers le **guide**.
Charte : marine `#0e2a47`, turquoise `#12b5c9`, IBM Plex Sans, **zéro emoji**, sobre et
professionnel. Aucune dépendance externe (ni police, ni script distant).

### Brique 3 — Le guide illustré (le cœur du chantier)

Un guide qui prend le collègue par la main, **avec des captures d'écran que tu fais toi-même**,
dans le **mode DÉMO** (données fictives, jamais de données réelles — RGPD).

Il doit couvrir, dans l'ordre où l'on s'en sert :
1. Télécharger, débloquer, décompresser, double-cliquer.
2. Créer le compte administrateur (premier écran).
3. Renseigner l'établissement, le personnel, les habilitations.
4. Créer une machine, une bouteille, un client.
5. **Faire une intervention** (le wizard 6 étapes, jusqu'à la signature) et éditer le CERFA.
6. Le contrôle d'étanchéité, le dossier de fuite.
7. La balance matière et l'inventaire annuel.
8. **Le dossier d'audit annuel scellé** (le moment où l'inspecteur arrive).
9. La sauvegarde et la restauration (l'exigence n° 1 : ne rien perdre).
10. Les rôles (professeur / élève) et le mode formation.

Pour chaque étape : **où l'on clique**, **ce qu'on doit voir**, et **les points de blocage**
(ce qui bloque, pourquoi, et comment débloquer). Les blocages sont voulus par le logiciel : une
écriture validée ne se modifie plus, une fuite ouverte interdit le complément de gaz, un élève ne
peut pas valider. **Explique-les, ne les contourne pas.**

⚠️ **Réserve sur les captures** : le navigateur intégré a lâché deux fois le 14/07 (plus
d'événements souris, capture d'écran qui expire). C'est intermittent. Prends les captures **au
fil de l'eau**, enregistre-les dès qu'elles sont bonnes, et si la souris lâche, dis-le et
reprends plus tard — **ne fabrique jamais une capture que tu n'as pas réellement obtenue.**

### Brique 4 (option) — Le vocal

Un bouton « écouter cette étape » sur chaque section du guide, avec l'API **`speechSynthesis`**
du navigateur : **native, gratuite, hors ligne**, zéro dépendance. Les voix françaises de Windows
sont correctes. Prévoir le repli propre si aucune voix n'est disponible (bouton masqué).

## RÈGLES

- **JAMAIS toucher au `data/` réel** de Franck (incident du 06/07). Toute vérification se fait sur
  un **port jetable neuf** et une **base jetable** (`IWF_CHEMIN_BASE`), jamais le port 2011.
- Français simple, zéro anglicisme, **zéro emoji dans le code**.
- Rien qui appelle un serveur extérieur : ni police web, ni script distant, ni mouchard.
- Après chaque brique : `node outils/lancer-tests.mjs` **TOUT VERT** (71 exécutions), CHANGELOG,
  commit, push.
- Annoncer le réglage conseillé en français avant chaque tâche de code.
- Sobriété : lire la carte du code plutôt que fouiller, déléguer les grandes recherches à UN agent.

## LE NOM DE DOMAINE : `inerweb.ovh`

Franck a déposé **`inerweb.ovh`** (contact : **inerweb.fh@gmail.com**). La vitrine doit y vivre.

⚠️ **L'ORDRE EST IMPÉRATIF — inversé, il rend le site INACCESSIBLE.** Publier un fichier `CNAME`
dans le dépôt fait basculer GitHub Pages sur le domaine personnalisé : si les DNS ne pointent pas
encore vers GitHub, le site ne répond plus **ni** sur `inerweb.ovh`, **ni** sur `github.io`.

1. **D'ABORD, chez OVH** (zone DNS de `inerweb.ovh`) — c'est Franck qui le fait, personne d'autre
   n'a accès à son compte :
   - 4 enregistrements **A** sur le domaine nu (`inerweb.ovh`) :
     `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - 4 enregistrements **AAAA** (IPv6, vérifiés) :
     `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`
   - 1 **CNAME** pour `www` → `frigorx.github.io.`
2. **Attendre la propagation** (quelques minutes à quelques heures), puis **vérifier** :
   `nslookup inerweb.ovh` doit renvoyer les adresses ci-dessus.
3. **ENSUITE seulement**, créer le fichier `CNAME` à la racine du dépôt, contenant une seule
   ligne : `inerweb.ovh`. Puis, dans GitHub → Settings → Pages, renseigner le domaine et cocher
   **« Enforce HTTPS »** (le certificat Let's Encrypt met de quelques minutes à 24 h à sortir).
4. Le lien de la démo devient `https://inerweb.ovh/v8/`. **Mettre à jour tous les liens** du
   README, de la mémoire et de la vitrine.

## CE QUI ATTEND FRANCK

1. **La bascule DNS chez OVH** (étape 1 ci-dessus) — lui seul peut la faire.
2. Le **texte de présentation** de la page d'accueil : à écrire, puis à lui faire valider — c'est
   sa vitrine, pas la nôtre.
3. **`RGPD.md`** : à relire avant diffusion. Chaque établissement qui installe le logiciel devient
   responsable de ses données ; le document doit le dire clairement.

## L'ÉTAT DU PRODUIT (pour mémoire)

Registre opposable (hash chaîné, WORM, contre-écritures, journal chaîné avec **témoin d'identité**),
CERFA officiel rempli, wizard 6 étapes signé, balance matière, inventaire nominatif, dossiers de
fuite, habilitations B2 (mode **conseil**), outillage, BSFF, coffre-fort chiffré, dossier d'audit
scellé + vérificateur autonome embarqué, feu tricolore, parcours d'audit guidé en 9 étapes, comptes
et rôles (**les 43 verrous sont prouvés par un test**), mode démo et mode formation.
**Licence : PolyForm Noncommercial 1.0.0** — gratuit pour l'enseignement, payant pour le commerce.
**Auteur : Franck Henninot** (LP Jacques Raynaud, Marseille) — `inerweb.fh@gmail.com`, `inerweb.ovh`.

⚠️ **Ce qu'il ne faut PAS promettre dans la vitrine** : le mode « Officiel » à blocage dur n'est
pas activé (le logiciel **conseille**, il ne bloque pas), et la grille réglementaire n'a jamais été
validée ligne à ligne. La formule honnête, à reprendre telle quelle : « il implémente la lecture de
l'arrêté par son auteur, en mode conseil ».
