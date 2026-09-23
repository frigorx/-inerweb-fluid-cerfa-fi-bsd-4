# Accéder à inerWeb depuis un poste de l'établissement

> Document vivant. Constat du 22/09/2026 : sur un PC du lycée, l'ouverture de
> `https://inerweb.fr` est refusée par Kaspersky Endpoint Security — « Accès à
> un domaine doté d'un certificat douteux ». Ce document dit ce qui a été
> mesuré, ce qui ne peut pas l'être à distance, et la marche à suivre.

## 1. Ce qui a été mesuré depuis l'extérieur, le 22/09/2026

| Point | Mesure |
|---|---|
| Serveurs de noms | `miki.ns.cloudflare.com`, `trace.ns.cloudflare.com` — le domaine est géré par Cloudflare. |
| Adresses | `104.21.18.21`, `172.67.179.162`, `2606:4700:3033::6815:1215`, `2606:4700:3034::ac43:b3a2` — plages Cloudflare, **partagées avec des milliers d'autres sites et changeantes**. |
| Origine réelle | GitHub Pages : la réponse porte `x-github-request-id`, `x-github-edge-region`, et passe par Fastly (`x-served-by`, `x-fastly-request-id`). Cloudflare est en façade. |
| Réponse | `HTTP 200`, page « inerWeb Édu — le froid et la climatisation, station par station ». |
| `www.inerweb.fr` | `HTTP 301` vers `https://inerweb.fr/`. |
| Certificats publics en cours de validité (journaux de transparence) | `inerweb.fr` + `*.inerweb.fr` délivré par **Let's Encrypt YE1** (05/09 → 04/12/2026) ; `inerweb.fr` + `*.inerweb.fr` délivré par **Google Trust Services WE1** (03/09 → 02/12/2026) ; `inerweb.fr` + `www.inerweb.fr` délivré par **Let's Encrypt YR2** (19/08 → 17/11/2026) — vraisemblablement celui de l'origine GitHub Pages : il couvre le couple `inerweb.fr` / `www.inerweb.fr`, qui est la façon de faire de GitHub Pages, et non le joker des deux autres. |
| Chaîne réellement servie (mesure Qualys SSL Labs, note **A** sur les quatre adresses) | `CN=inerweb.fr` (ECDSA P-256) ← **GTS WE1** (Google Trust Services) ← **GTS Root R4** (ECDSA P-384), lui-même contre-signé par l'ancienne racine **GlobalSign Root CA** (RSA, signature SHA-1) pour les clients anciens. Chaîne **intégralement ECDSA**. |

**Ce que cela établit** : vu d'Internet, le site répond normalement, avec un
certificat public valide, non expiré, au bon nom, renouvelé automatiquement.
Le refus n'est pas produit par le site : il est produit **sur le poste**, ou
par un équipement placé entre le poste et Internet.

Deux conséquences pratiques, à retenir pour la suite :

- Les certificats sont renouvelés tous les 90 jours environ, et Cloudflare
  peut **changer d'autorité de délivrance** (Let's Encrypt ↔ Google Trust
  Services) à chaque renouvellement, sans prévenir.
- Les adresses IP sont mutualisées Cloudflare. Une autorisation posée **par
  adresse IP** ouvrirait des milliers de sites étrangers au nôtre et cesserait
  de fonctionner au prochain changement. L'autorisation doit se faire **par nom
  de domaine**.

## 2. Ce que le message signifie

L'écran vient du composant **« Analyse des connexions chiffrées »** de Kaspersky
Endpoint Security (l'intitulé varie selon les versions). Pour inspecter le
trafic HTTPS, KES ouvre lui-même la connexion TLS vers le site, la vérifie,
puis la re-signe avec sa propre autorité avant de la rendre au navigateur.

Le point décisif : **KES valide la chaîne contre SON magasin de certificats de
confiance, distinct de celui de Windows et de celui de Chrome.** Ce magasin est
alimenté par les bases de l'antivirus. Un poste dont les bases sont anciennes
peut donc refuser une chaîne que le même poste accepterait parfaitement hors
inspection.

## 3. Les trois causes possibles

Une seule est vraie sur ce poste ; le test du § 4 dit laquelle.

| # | Cause | À quoi on la reconnaît |
|---|---|---|
| A | **KES n'arrive pas à remonter la chaîne jusqu'à une racine qu'il connaît.** La chaîne servie aujourd'hui repose sur **GTS Root R4**, une racine jeune, et elle est **intégralement ECDSA**. Un magasin KES daté peut ne pas contenir GTS Root R4 : il ne lui reste alors que la contre-signature par GlobalSign Root CA, qu'un validateur strict — ou qui ne sait pas construire un chemin par contre-signature — peut refuser. Les intermédiaires en circulation (`WE1`, `YE1`, `YR2`) datent d'août et septembre 2026. | Le certificat affiché est bien délivré par Google Trust Services, Let's Encrypt ou Cloudflare. |
| B | **Un second équipement d'inspection TLS** (filtrage de l'établissement, de la région ou du rectorat) coupe déjà la connexion en amont. KES reçoit alors un certificat signé par l'autorité de ce boîtier, qu'il n'a aucune raison de connaître. | Le certificat affiché porte un nom d'établissement, de collectivité, ou d'éditeur de filtrage (Fortinet, Stormshield, Olfeo, Sophos, Palo Alto, Zscaler, Kerio…). |
| C | Refus de fond : nom non couvert, date dépassée, révocation invérifiable. | Le détail du message le dit explicitement. Peu probable : le certificat public est valide (§ 1). |

La phrase du constat — « je ne passe toujours pas les filtres » — oriente vers
**B**, mais **A** est tout aussi compatible avec l'écran observé. Ne rien
demander à la DSI avant d'avoir fait le test ci-dessous : la demande n'est pas
la même selon le cas, et une demande mal ciblée coûte une relance.

## 4. Le test qui tranche — 2 minutes, sur le poste concerné

Sur l'écran Kaspersky :

1. Cliquer **« Afficher les détails »** et photographier le texte qui apparaît :
   il nomme la raison exacte du refus.
2. Cliquer **« Consulter le certificat »**, onglet *Général*, et lire la ligne
   **« Délivré par »**. Photographier aussi l'onglet *Chemin d'accès de
   certification*.
3. Ne **pas** cliquer « Je comprends les risques et je veux poursuivre » (§ 7).

| « Délivré par » | Cause | Ce qu'il faut demander |
|---|---|---|
| `Let's Encrypt` (YE1, YR2…), `Google Trust Services` (WE1), `Cloudflare Inc` | **A** | Mise à jour des bases KES, **puis** adresse de confiance (§ 5, point 1). |
| Un nom d'établissement, de collectivité, de rectorat, ou un éditeur de filtrage | **B** | Autorisation du domaine dans le filtre web (§ 5, point 2). |
| `Kaspersky …` (autorité d'inspection de KES) | À relire | C'est le certificat de ré-signature de KES, pas celui du site : reprendre l'onglet *Chemin d'accès de certification* et lire le maillon du haut. |

## 5. Demande à adresser à la DSI ou au RSSI

À envoyer une fois le test fait, en joignant les deux photographies. Texte à
reprendre tel quel :

> Objet : autorisation d'accès à inerweb.fr (ressource pédagogique — filière
> froid et climatisation)
>
> Bonjour,
>
> Dans le cadre de mes cours, j'utilise avec mes élèves la ressource
> pédagogique hébergée sur `inerweb.fr`. Depuis les postes de l'établissement,
> l'accès est refusé par Kaspersky Endpoint Security avec le message « Accès à
> un domaine doté d'un certificat douteux » (copie d'écran jointe).
>
> Vérification faite depuis l'extérieur, le site répond normalement avec un
> certificat public valide, noté A par Qualys SSL Labs. La chaîne servie est :
> `inerweb.fr` (ECDSA P-256) ← `GTS WE1` (Google Trust Services) ← `GTS Root R4`,
> contre-signée par `GlobalSign Root CA`. Elle est renouvelée automatiquement tous
> les 90 jours, et l'autorité peut alterner entre Google Trust Services et Let's
> Encrypt. Le site est hébergé sur GitHub Pages derrière Cloudflare.
>
> Si les bases de Kaspersky sur ces postes ne contiennent pas la racine
> `GTS Root R4`, cela suffit à expliquer le refus : l'analyse des connexions
> chiffrées valide la chaîne contre son propre magasin, distinct de celui de
> Windows.
>
> Je vous remercie de bien vouloir :
>
> 1. **Mettre à jour les bases de Kaspersky Endpoint Security** sur les postes
>    concernés, puis, si le refus persiste, ajouter les domaines ci-dessous aux
>    **adresses de confiance** de l'analyse des connexions chiffrées (stratégie
>    Kaspersky Security Center → Paramètres réseau → Analyse des connexions
>    chiffrées → Adresses de confiance).
> 2. **Autoriser ces mêmes domaines dans le filtrage web** de l'établissement,
>    en catégorie pédagogique.
>
> Domaines concernés :
>
> - `inerweb.fr` et `*.inerweb.fr` (le site)
> - `www.inerweb.fr` (redirige vers le précédent)
> - `frigorx.github.io` (modules hébergés sur GitHub Pages)
> - `github.com` (téléchargement des outils)
> - `youtu.be` et `www.youtube.com` (vidéos intégrées aux séquences), si le
>   filtrage de l'établissement le permet
>
> **Merci de poser ces règles par nom de domaine et non par adresse IP** : le
> site est servi par Cloudflare sur des adresses mutualisées et changeantes,
> une exception par IP ouvrirait d'autres sites et cesserait de fonctionner au
> prochain changement.
>
> Je reste disponible pour tout élément complémentaire.

## 6. inerNoWeb — la copie qui n'a besoin de personne

C'est la voie retenue, et la seule des trois qui ne dépende ni de la DSI, ni
de l'antivirus, ni de l'humeur du réseau ce matin-là.

Les ressources publiées sont des pages statiques : HTML, CSS, JavaScript,
images. Aucune n'appelle de serveur — vérifié le 22/09/2026 sur la page
d'accueil, un réseau, une station et un module : ni `fetch`, ni
`XMLHttpRequest`, ni module ES, ni fichier JSON chargé à l'exécution.
Copiées telles quelles dans un dossier, elles s'ouvrent d'un double-clic,
**sans installation, sans droits d'administrateur et sans connexion**.

    npm run inernoweb        (archive complète, narrations comprises)
    node outils/fabriquer-inernoweb.mjs --zip      (sans les narrations)

L'outil (`outils/fabriquer-inernoweb.mjs`) parcourt le site publié, prend tout
ce qui lui appartient, réécrit les liens pour le protocole `file://`, écrit un
LISEZ-MOI, puis **relit le dossier produit et signale toute référence locale
qui ne pointe sur rien**. C'est ce contrôle, et non la réécriture, qui dit si
la copie tient debout ; il rend un code de sortie non nul si elle ne tient pas.

Ce qu'il ne peut pas emporter, et qu'il annonce au lieu de le taire : les
vidéos YouTube et tout ce qui vit sur un autre domaine restent des liens vers
Internet. Les formulaires qui demandent un accès ou activent une licence
parlent à un serveur : ils ne répondront pas depuis la clé.

Pour mettre à jour, rejouer la même commande depuis un poste connecté : le
dossier et l'archive sont refaits à neuf, et l'ancienne copie de la clé est
écrasée par la nouvelle. Le site évolue, la copie se régénère.

Le registre réglementaire, lui, est déjà dans ce cas depuis toujours :
`lancer-inerweb.bat` sert son interface depuis le poste et n'a jamais eu
besoin d'Internet (voir `INSTALLATION_SIMPLE.md`).

### Fabriquer la clé sans taper une ligne

`FABRIQUER-INERNOWEB-SUR-CLE.bat`, à la racine du dépôt. Double-clic, il
demande la lettre de la clé — en listant d'abord les lecteurs branchés — et
écrit `inerNoWeb` dessus, narrations, navigateur et dézippeur compris.

Il vérifie **avant** de faire patienter : que le fabricant est bien à côté de
lui, que Node est installé, que le lecteur existe. Et il annonce la
destination avant d'écrire, parce que l'outil refait ce dossier à neuf.

En ligne de commande, l'équivalent :

    node outils/fabriquer-inernoweb.mjs --voix --navigateur --dezippeur --sortie E:\inerNoWeb

### Le navigateur du poste : la question qui vient avant tout le reste

Les postes visés tournent sous **Windows 7**. Or la copie hors ligne ne
demande pas seulement un dossier : elle demande un navigateur capable de la
lire. Relevé dans la copie elle-même : **541 fichiers utilisent l'accès
optionnel (`a?.b`)** et **55 utilisent `Array.at()`**. Il faut donc au moins
**Chrome 92 ou Firefox 90**. **Internet Explorer 11 — seul navigateur garanti
sur un Windows 7 d'origine — ne convient pas** : les pages s'ouvriront vides.

Chaque copie porte désormais **`EST-CE-QUE-CA-MARCHE.html`**, à ouvrir en
premier sur chaque poste. Elle répond en cinq secondes. Elle est écrite en
JavaScript de 2010 — ni fonction fléchée, ni `const`, ni gabarit — pour une
raison précise : **elle doit s'afficher même sur le navigateur qu'elle va
recaler**. Une page de diagnostic écrite en syntaxe moderne rend une page
blanche sur un vieux navigateur, et laisse l'enseignant sans réponse devant
sa classe.

### Le navigateur embarqué (`--navigateur`)

Si le poste n'a rien d'assez récent, l'option emporte **Firefox ESR 115** — la
dernière lignée que Mozilla maintient pour Windows 7, et elle vit toujours
(115.41.0esr au 23/09/2026). Mozilla ne publie **aucune version portable** :
seulement un `.exe` et un `.msi`. Mais l'installeur est une archive 7-Zip
auto-extractible ; ouverte à la fabrication, elle rend un dossier qui se lance
tel quel, **sans installation ni droits d'administrateur**. Les binaires ne
sont pas modifiés — Mozilla autorise la redistribution de Firefox non modifié.
Compter **~215 Mo**, plus 55 Mo pour l'installeur, qui **reste dans la copie**
(voir la route 1 ci-dessous).

**Si 7-Zip manque sur la machine qui fabrique, ce n'est pas bloquant.**
L'installeur de Firefox sait se déposer lui-même où on lui dit, pour
l'utilisateur courant, sans droits d'administrateur : c'est ce que fait
`INSTALLER-LE-NAVIGATEUR.bat`, écrit dans chaque copie. 7-Zip est cherché dans
le `PATH` **et** là où Windows l'installe — ne regarder que le `PATH`, c'est
le déclarer absent chez la plupart de ceux qui l'ont.

### Le dézippeur (`--dezippeur`) — et pourquoi il ne sert pas à lire la copie

Dit d'abord, parce que cela évite un téléchargement inutile : **la copie n'est
pas une archive.** C'est un dossier, qui s'ouvre tel quel. Et **Windows 7 ouvre
déjà les `.zip` tout seul**, par un clic droit « Extraire tout ». Aucun
dézippeur n'est nécessaire pour se servir d'inerNoWeb. L'option `--zip` de
l'outil ne sert qu'à transporter la copie par un canal qui veut un seul
fichier ; en visant directement une clé, on s'en passe.

L'option existe pour autre chose : avoir sur la même clé de quoi ouvrir les
`.7z` et les `.rar`, que Windows ne sait pas lire, et de quoi **installer
7-Zip sur un poste qui ne l'a pas**. 7-Zip est libre (LGPL) et redistribuable ;
son installeur s'ouvre comme celui de Firefox et rend un `7zFM.exe` qui se
lance sans installation. La version 32 bits est emportée : elle tourne sur les
Windows 32 **et** 64 bits. Compter **~6 Mo**, installeur compris. La version
n'est pas écrite en dur : l'outil relève la dernière publiée.

### Deux situations, deux conduites — et elles ne se confondent pas

| Le poste | Ce qu'il faut faire |
|---|---|
| **Vous l'administrez**, et il n'a plus de navigateur lisible (Internet Explorer seul, par exemple) | `INSTALLER-LE-NAVIGATEUR.bat` : Firefox s'installe pour l'utilisateur courant. Le poste garde son navigateur quand la clé repart. Ici le navigateur embarqué n'est pas un contournement — **c'est la seule façon d'ouvrir ces pages**, IE11 ne sachant pas lire `a?.b`. |
| **Il est géré par l'établissement** | Autre chose. Lancer un navigateur depuis une clé USB y est souvent bloqué, et à bon droit : c'est le schéma classique d'une attaque. Sur un parc verrouillé après un rançongiciel, attendez un refus de la stratégie d'application ou de l'antivirus, et une trace au nom de celui qui a essayé. On demande d'abord, on essaie ensuite. |

`OUVRIR-INERNOWEB.bat` lance le navigateur sur la copie, avec un profil rangé
**dans la clé** : rien n'est écrit dans le PC.

### Ce que donne la fabrication, au 22/09/2026

| Point | Mesure |
|---|---|
| Pris | 1 294 fichiers, 32,8 Mo sur disque, archive déflatée de 19,4 Mo |
| Images assemblées en JavaScript | **263 retrouvées**, 127 pistes écartées |
| Téléchargements en échec | **0** |
| Références locales sans cible | **0** |
| Adresses hors du site | 46, recensées et annoncées |
| Fonds de narration (option `--voix`) | 5 705 fichiers, 484 Mo, hors de l'archive par défaut |

**Vérifié dans un vrai navigateur, pas seulement sur le papier.** Trois pages
du dossier produit ont été ouvertes en `file://` avec Chromium, leurs
commandes actionnées une à une, puis relevées : images rendues, requêtes en
échec, erreurs JavaScript. Résultat : **aucune image cassée, aucune erreur
JavaScript**. C'est ce contrôle-là qui autorise à dire que la copie marche —
l'analyse statique, seule, ne voit pas ce que le JavaScript fabrique.

### Ce que la première passe avait cassé, et qui est réparé

La version du 22/09 au matin réécrivait **aussi l'intérieur des `<script>`**.
Or `src="${ASSET}${file}"` n'y est pas une adresse : c'est un gabarit. La
réécriture en faisait `src="${ASSET}${file}/index.html"` — du JavaScript
corrompu, hors ligne **comme en ligne** si on avait republié ces pages. Le
contenu des `<script>` est désormais rendu tel quel, sans exception.

Le même aveuglement expliquait les images manquantes : ces adresses-là ne se
lisent pas dans le marquage. L'outil lit maintenant les scripts **sans rien y
changer**, pour y relever les noms de fichiers écrits en clair et les
constantes de chemin, puis essaie les combinaisons. Une piste qui ne répond
pas est une supposition écartée, pas un manque — elle n'alarme plus et ne
fait plus échouer la fabrication.

### Ce qui ne marche toujours pas hors ligne, et pourquoi

| Point | État |
|---|---|
| Vidéos YouTube et liens externes | Hors du site : ils resteront hors ligne. Recensés et annoncés. |
| Formulaires d'accès et d'activation | Ils parlent à un serveur. Sans réseau, ils ne répondent pas. |
| Décodage des courriels | Cloudflare injecte un script qui rappelle `/cdn-cgi/…` en chemin **absolu**. Le fichier est bien dans la copie, mais `file://` n'a pas de racine : les adresses de contact restent masquées. Cosmétique, et ce n'est pas le site qui l'écrit. |
| Narrations enregistrées | Hors de l'archive sauf `--voix`. **Le bouton de lecture fonctionne quand même** : `moteur/voix.js` retombe sur la synthèse vocale du navigateur — « le cours ne dépend donc jamais du lot audio ». Le fonds apporte la qualité, pas la fonction. |

### Les dépannages d'appoint

À n'utiliser que le temps d'une séance, si la clé n'est pas là.

| Ressource | Adresse | État vérifié le 22/09/2026 |
|---|---|---|
| Station « pressostats » | `https://frigorx.github.io/inerweb-pressostats/` | `HTTP 200` — autre nom de domaine. |
| Module F-Gaz | `https://frigorx.github.io/inerweb-fgaz/` | `HTTP 200`. |
| Démonstration de l'application CERFA (v8) | `https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/` | `HTTP 200`. |

Sans se tromper d'espoir : **la majeure partie des séquences (aerorezo,
electrorezo, hydrometro, hocourant, formation, galerie) est servie par
`inerweb.fr` lui-même**, pas par `frigorx.github.io`. Ces trois adresses
couvrent trois modules, pas le site.

## 6 bis. Si le test dit la cause A, un levier existe côté site

À n'actionner **qu'après** confirmation par le § 4 — pas avant.

Cloudflare choisit seul l'autorité à chaque renouvellement et alterne entre
Google Trust Services et Let's Encrypt : les deux certificats relevés au § 1 en
témoignent. D'où, dans l'ordre :

1. **Le renouvellement suivant peut suffire.** Le certificat en service expire
   le 02/12/2026 et sera remplacé avant. Si Cloudflare bascule sur Let's
   Encrypt, l'ancrage de la chaîne change — et le test du § 4 est à refaire.
   Ce n'est pas un correctif, c'est un coup de dé ; mais cela explique qu'un
   accès puisse tomber en panne, ou se rétablir, sans que rien n'ait été
   touché ici.
2. **Choisir l'autorité de certification** n'est pas offert sur l'offre
   gratuite de Cloudflare : cela relève d'Advanced Certificate Manager, qui est
   payant. À mettre en regard du coût d'une relance auprès de la DSI.

Un troisième geste est souvent conseillé sur les forums — repasser le domaine
en « DNS only » (nuage gris) pour que GitHub Pages serve directement son propre
certificat. Il est réversible en une minute, mais il retire la façade
Cloudflare de la production **pour tous les visiteurs**, le temps du test et de
la propagation DNS. À ne tenter que hors heures de cours, et seulement si la
cause A est confirmée.

Dans tous les cas, aucun de ces leviers ne règle la cause B : si un boîtier de
l'établissement inspecte le trafic, il présentera son propre certificat quelle
que soit l'autorité choisie ici.

## 7. Ce qu'il ne faut pas faire

- **Cliquer « Je comprends les risques et je veux poursuivre »** sur un poste de
  l'établissement. C'est contourner une protection posée par l'employeur, sur
  un matériel qui ne nous appartient pas — et le faire devant des élèves leur
  enseigne exactement le geste qu'on leur demande de ne pas avoir. Sur un poste
  personnel, la question est autre ; ici, non.
- **Désactiver ou suspendre Kaspersky.** Ce n'est ni notre main ni notre
  responsabilité, et la stratégie le réimposera.
- **Changer d'hébergement ou de configuration Cloudflare avant le test du § 4.**
  Tant qu'on ne sait pas quelle cause est en jeu, tout changement est un pari —
  et un pari qui touche un site aujourd'hui noté A et qui fonctionne pour tout
  le monde ailleurs. Une fois la cause A confirmée, les leviers légitimes sont
  au § 6 bis.
- **Demander une exception par adresse IP** (§ 1).

## 8. Ce qui n'est pas établi

Ces points ne sont pas mesurables à distance et doivent être relevés sur place :

- Le certificat **réellement reçu par le poste** — c'est tout l'objet du § 4.
- La version de Kaspersky Endpoint Security et la date de ses bases.
- L'existence, la marque et le périmètre d'un équipement d'inspection TLS de
  l'établissement ou de la collectivité.
- Le fait que le refus vienne de ce poste seulement ou de tous les postes : à
  essayer depuis un second poste, et depuis un autre réseau (partage de
  connexion mobile) pour isoler le réseau de l'établissement.

## 9. À revoir périodiquement

Les certificats sont renouvelés tous les 90 jours et l'autorité peut changer
d'un renouvellement à l'autre. Une autorisation posée **par nom de domaine**
survit à ces renouvellements ; une exception posée sur une empreinte de
certificat, sur une autorité précise ou sur une adresse IP ne leur survit pas.
Si l'accès retombe en panne quelques mois après avoir été ouvert, c'est la
première chose à vérifier avec la DSI.
