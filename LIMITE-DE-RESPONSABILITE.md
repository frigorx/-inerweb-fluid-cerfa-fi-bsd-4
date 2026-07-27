# Limite de responsabilité — inerWeb Fluide

> **Logiciel** : inerWeb Fluide 8.0.0-dev. **Dernier commit modifiant le code livré** :
> `2ca4aa0` du 26/07/2026 — à revérifier par `git log -1 --format=%h -- server v8 outils`.
> Le numéro du dernier commit du dépôt **n'est pas écrit ici** : ce document et ses annexes
> sont enregistrés **après** la version qu'ils décrivent, donc aucun numéro fixe ne tomberait
> juste. Il se relève à la lecture par `git log -1 --format=%h`.
> **Document établi le 26/07/2026**, à relire à chaque évolution du logiciel.
> Écrit pour trois lecteurs : le chef d'établissement, un agent de contrôle, un futur
> utilisateur. Chaque affirmation technique cite le fichier et la ligne qui la portent, pour
> être vérifiée sans nous croire sur parole.

## 1. Ce que le logiciel fait réellement

inerWeb Fluide tient le registre de traçabilité des fluides frigorigènes d'un atelier. Il
fonctionne **entièrement en local** : aucune donnée ne part vers un service extérieur.

| Ce qu'il fait | Où c'est écrit dans le code |
|---|---|
| **Il enregistre** équipements, bouteilles, interventions, contrôles d'étanchéité, personnel autorisé, pièces justificatives. | `v8/js/data/contrat.js` (96 méthodes, contrat v13) |
| **Il scelle** : chaque écriture validée reçoit une empreinte SHA-256 chaînée à celle de l'écriture précédente. | `server/api.js:6739` (`sceller`), `server/db.js:455` |
| **Écriture unique** : une écriture validée n'est ni modifiable ni effaçable. Des déclencheurs de la base refusent la suppression et la modification, y compris pour une commande passée directement à la base. Ces déclencheurs vivent **dans le fichier de base** : ils n'arrêtent pas quelqu'un qui remplace ce fichier (voir § 2 b). | `server/schema.sql:341`, `:355`, `:403` ; journal `:547`, `:553` |
| **Correction par contre-écriture seulement** : une erreur ne s'efface pas, elle se corrige par une écriture inverse qui désigne l'écriture d'origine. | `v8/js/data/contrat.js:210` ; message du verrou `server/schema.sql:345` |
| **Il détecte les altérations passées par le canal applicatif** : chaîne des empreintes et journal revérifiés, fichier d'import retouché refusé. | `server/api.js:6798`, `server/db.js:419`, `server/api.js:5496` |
| **Il produit les fiches CERFA 15497\*04** en remplissant le formulaire officiel. | `v8/js/cerfa/generateur.js:59`, `:693` |
| **Il produit la déclaration annuelle** à onze rubriques par fluide. | `v8/js/data/declaration-annuelle.js:35` |

**État à ce jour : le mode Officiel est fermé** par un verrou unique
(`server/blocage-officiel.js:24`, `v8/js/data/blocage-officiel.js:31`). Tant qu'il est fermé,
**aucune fiche d'intervention opposable n'est validée**.

Une précision qui compte, parce que c'est la première question qu'un agent de contrôle
posera : **seule la fiche CERFA porte une marque distinctive**. La mention « MODE FORMATION
— DOCUMENT NON OFFICIEL » n'existe qu'à un seul endroit du dépôt
(`v8/js/cerfa/generateur.js:93`) ; elle est apposée au cadre 14 de la fiche
(`v8/js/cerfa/generateur.js:538`) et doublée d'un filigrane sur le rendu (`:754`). **Tous les
autres documents sortent sans marque**, et il y en a vingt et un : ils sont énumérés un par un
au § 2 g). C'est une limite réelle, pas une nuance de rédaction, et elle appelle une décision.

Vérification par soi-même : `node outils/lancer-tests.mjs --tout` (filet complet) et
`node server/test-securite-negative.mjs` (les refus, réellement exécutés contre un serveur,
sur un port et une base jetables). Le filet donne « TOUT VERT — 128 exécutions » ; sa durée
est **de l'ordre de 100 secondes** et varie d'une exécution à l'autre (96,8 s, 97,9 s et
98,8 s à trois mesures du 26/07/2026 sur la même version) : elle ne se publie pas au
centième, c'est un ordre de grandeur.

## 2. Ce que le logiciel ne garantit PAS

C'est le cœur de ce document.

**a) L'exactitude des valeurs réglementaires.** Les seuils, fréquences et dates codés **n'ont
été visés par aucun organisme agréé**. Onze questions écrites préparées à cet effet sont
restées **sans réponse** (`docs/T3-DOSSIER-RELECTURE-EXTERNE.md` § 2.3). Certaines valeurs
sont codées de façon délibérément conservatrice — « jamais moins de contrôles qu'exigé » — et
restent révocables sur avis qualifié. Le détail — quelle valeur, où elle est codée, sur quoi
elle repose, avec quel degré de certitude — est tenu dans le **registre des arbitrages**
(`docs/REGISTRE-DES-ARBITRAGES.md`) ; l'inventaire des limites connues du logiciel est tenu
dans `docs/POINTS-DE-FRICTION.md`.

**b) L'intégrité face à quelqu'un qui a la main sur le disque du poste.** Les protections
visent le **canal applicatif** : application, interface de programmation, import. Les
déclencheurs qui verrouillent les écritures vivent dans le fichier de base : **qui peut
remplacer ce fichier n'est arrêté par rien**. Le témoin d'intégrité du journal **se
recalcule** — l'algorithme est dans le code, et le code est diffusé : il arrête une purge
faite à la main, pas quelqu'un qui régénère le témoin après coup (`CHANGELOG.md:575-578`,
détaillé dans `docs/POINTS-DE-FRICTION.md` § 9). Il n'existe **ni ancrage chez un tiers, ni
horodatage qualifié**. *(Trois lignes sous cette référence, le même journal en déclare un
autre, sans effet probant : le bouton d'export de sauvegarde reste offert à l'écran à des
rôles qui n'y ont plus droit, le serveur refusant en 403. Il est décrit au § 13 de
`docs/POINTS-DE-FRICTION.md` — mieux vaut le lire ici que le découvrir là-bas.)*

**c) La disponibilité.** Le logiciel tourne sur **un seul poste**, sans redondance. Une panne
rend le registre indisponible jusqu'à restauration d'une sauvegarde. Faire les sauvegardes,
les sortir du poste et les tester relève de l'établissement.

**d) Il ne remplace pas le bordereau dématérialisé des déchets.** Le suivi de remise en
filière qu'il produit est un document **interne**, et le logiciel le dit en permanence à
l'écran comme dans le dossier d'audit : « il ne remplace pas le bordereau de suivi de déchets
dématérialisé obligatoire » (`v8/js/data/remise-filiere.js:33`). Le bordereau officiel
s'établit sur la plateforme nationale, se joint et se reporte.

**e) Les signatures ne sont pas des signatures électroniques avancées ou qualifiées** au sens
de la réglementation européenne. Ce sont des **tracés manuscrits** capturés à l'écran,
associés à un contexte (personne déclarée, qualité, date, révision de la fiche, compte depuis
lequel la signature a été posée) et scellés avec l'écriture. Ni le logiciel ni ses documents
ne prétendent le contraire.

**f) La conformité juridique globale de l'exploitation.** Un logiciel ne rend pas un atelier
conforme. Ce qui est fait, par qui, avec quelle aptitude et quel matériel ne dépend pas de lui.

**g) Que tout document sorti du logiciel se distingue d'un document officiel.** Seule la
fiche CERFA porte la mention « MODE FORMATION — DOCUMENT NON OFFICIEL » et son filigrane
(`v8/js/cerfa/generateur.js:93`, `:538`, `:754`). Un document produit pendant un cours
ressemble donc à un document produit pour de bon. Voici la liste, en entier.

<a id="inventaire-documents-sans-marque"></a>

> ### Inventaire des documents qui sortent sans marque distinctive
>
> *Établi le 26/07/2026. Cette liste est reprise **à l'identique** dans les quatre pièces du
> dossier — la présente limite, `docs/POINTS-DE-FRICTION.md`,
> `docs/REGISTRE-DES-ARBITRAGES.md` et `docs/NOTE-DECISION-ETABLISSEMENT.md` — parce qu'elle
> porte une consigne : un document absent de la liste échapperait à la consigne.*
>
> **Imprimés sur papier** (aperçu à l'écran, puis bouton « Imprimer ») :
>
> 1. **Fiche d'identification machine** — feuille A4 destinée à être **posée sur ou près de
>    l'équipement**, avec une case « Date de pose » et une case « Signature technicien » à
>    remplir à la main (`v8/js/documents/fiche-identification-machine.js:157`, `:161`,
>    `:413`). C'est l'imprimé qui ressemble le plus à une pièce officielle.
> 2. **Plaque F-Gas** (`v8/js/documents/plaque-fgas.js:341`).
> 3. **Bon d'intervention** (`v8/js/documents/bon-intervention.js:476`).
> 4. **Feuille de mise en service** (`v8/js/documents/feuille-mise-en-service.js:514`).
> 5. **Impression du bilan annuel**, qui porte en toutes lettres la section « **Déclaration
>    annuelle réglementaire — 11 rubriques** » (`v8/js/views/bilan.js:276-279` pour le titre,
>    `:779` pour l'impression).
> 6. **Audit en 5 minutes** — synthèse d'une page (`v8/js/views/bilan.js:684`, `:696`).
> 7. **Balance de matière** (`v8/js/views/balance.js:576`).
> 8. **Certificat de scellement** d'une archive — il porte l'empreinte SHA-256 et il est fait
>    pour être imprimé et classé (`v8/js/documents/verificateur.js:468`, téléchargement
>    `v8/js/documents/telecharger-dossier.js:78-88`).
> 9. **Étiquette de machine** (`v8/js/documents/etiquette-machine.js:303`).
> 10. **Étiquette de bouteille** (`v8/js/documents/etiquette-bouteille.js:401`).
> 11. **Étiquette de client** (`v8/js/documents/etiquette-client.js:268`).
> 12. **Étiquette d'outil** (`v8/js/documents/etiquette-outil.js:267`).
>
> **Fichiers téléchargés** :
>
> 13. **Dossier d'audit annuel**, archive ZIP scellée (`v8/js/documents/dossier-audit.js`).
> 14. **Dossier machine**, archive ZIP scellée (`v8/js/documents/dossier-machine.js`).
> 15. **Dossier client**, archive ZIP scellée (`v8/js/documents/dossier-client.js`).
> 16. **Dossier de fuite**, archive ZIP scellée (`v8/js/documents/dossier-fuite.js`).
> 17. **Vérificateur autonome** `99-VERIFICATEUR.html`, embarqué dans chacune de ces quatre
>     archives (`v8/js/documents/verificateur.js`).
> 18. **Exports CSV des tables du registre** (`v8/js/documents/exports.js`).
> 19. **Export CSV de la déclaration annuelle** (`v8/js/views/bilan.js:282`, `:773`).
> 20. **Journal d’audit en PDF** (`v8/js/documents/exports.js:688`) — page A4
>     paginée, titrée « Journal d’audit — inerWeb Fluide » et sous-titrée de la **raison
>     sociale de l’établissement** (`:720`, `:726-731`), produite par le bouton
>     « Exporter en PDF » de l’écran d’administration (`v8/js/views/admin.js:397`).
>     C’est la sortie qui ressemble le plus à une pièce officielle.
> 21. **Export CSV du bilan annuel** (`v8/js/views/bilan.js:330`), fichier
>     `bilan-fluides-AAAA.csv` — autre générateur que l’entrée n° 18, autre contenu que
>     l’entrée n° 19.
>
> **Une précision, pour éviter un contresens.** À l'intérieur des quatre archives, les
> **fiches CERFA sont bien marquées** : elles sortent du même générateur
> (`v8/js/cerfa/generateur.js:538`, `:754`). Ce qui ne l'est pas, c'est tout le reste de
> l'archive — sommaire, fichiers CSV, chronologie, vérificateur — et le certificat qui
> l'accompagne.
>
> **Deux sorties sont hors de cette consigne**, et elles sont nommées pour que
> l’inventaire soit complet. La **notice d’information des personnes** (protection des
> données, `v8/js/views/rgpd.js:534`) : imprimable sans marque elle aussi, mais **faite pour
> être remise** aux élèves et aux familles, et nul ne peut la prendre pour une pièce du
> registre des fluides. Et l’**export des données d’une personne** au titre du droit d’accès
> (fichier JSON, `v8/js/modales/personne-form.js:634`) : lui aussi destiné à être remis à
> la personne qui le demande. Ce sont des fichiers de données, pas des documents qui
> pourraient passer pour une pièce du registre.

**Et le repère de mode disparaît justement à l'impression.** À l'écran, le seul repère
permanent du mode est le badge de l'en-tête, rempli à « DÉMO / FORMATION » ou
« LOCAL / FORMATION » (`v8/index.html:58`, posé par `v8/js/app.js:628`, à l'intérieur du
`<header id="entete">` de `v8/index.html:50`). Or la feuille de style d'impression **masque
cet en-tête** : `#entete { display: none !important; }` dans le bloc `@media print` de
`v8/css/coquille.css:392-399`. Les imprimés produits depuis une modale d'aperçu vont plus
loin encore : ils masquent **tout** ce qui n'est pas le document lui-même
(`body * { visibility: hidden; }`, par exemple
`v8/js/documents/fiche-identification-machine.js:348-352` ou `v8/js/views/bilan.js:498-500`).
Autrement dit : **le repère de mode existe à l'écran et disparaît sur le papier.** C'est un
défaut du logiciel, pas une imprécision de rédaction ; il n'est pas corrigé, et il appelle
une décision au même titre que l'absence de marque.

**Vérification par soi-même**, et cette commande couvre bien ce qui est affirmé :

```
grep -rn "MENTION_FORMATION\|MODE FORMATION\|NON OFFICIEL\|non officiel" v8/js/ | grep -v "^v8/js/cerfa/"
```

Elle ne rend **rien** : hors du générateur CERFA, aucun module de `v8/js/` — ni
`documents/`, ni `views/` — n'écrit de mention de non-officialité. La contre-épreuve est la
même commande sans le filtre : elle rend vingt lignes, toutes dans `v8/js/cerfa/`. Pour
retrouver les imprimables eux-mêmes : `grep -rn "window.print()" v8/js/ | grep -v "test-"`
rend quinze lignes, dont trois sont des commentaires — donc **douze** déclencheurs
d'impression réels. Ce sont les onze imprimés numérotés 1 à 7 et 9 à 12, plus la notice de protection des
personnes. Le **certificat de scellement** (n° 8) n’y figure pas : c'est une page HTML téléchargée, puis imprimée depuis
le navigateur. *(Une version antérieure de ce document proposait
`grep -r FORMATION v8/js/documents/` : cette commande était trop étroite, des imprimables
vivent aussi dans `v8/js/views/`.)*

C'est **un défaut du logiciel**, et il appelle une décision de l'établissement : soit marquer
tout document produit hors mode Officiel — y compris sur le papier, ce qui suppose de
traiter la disparition du badge à l'impression —, soit encadrer par consigne écrite la sortie
de ces documents hors de l'atelier. Tant que ce n'est pas tranché, **aucun des vingt et un
documents énumérés ci-dessus ne doit être remis à un tiers.**

## 3. Qui reste responsable

**L'obligation de tenue du registre pèse sur le détenteur, c'est-à-dire l'ÉTABLISSEMENT.**
Elle ne se déplace ni vers un outil, ni vers l'auteur d'un outil.

> **Ce document ne transfère aucune obligation réglementaire et ne protège d'aucun contrôle.**
> Il sert à deux choses, et à deux seulement : empêcher qu'on se fie au logiciel au-delà de ce
> qu'il prouve, et permettre à l'établissement d'accepter les risques résiduels en
> connaissance de cause. Un document qui laisserait croire l'inverse serait pire qu'aucun
> document.

## 4. Les conditions d'emploi — sans elles, ce qui précède ne vaut plus

1. **Le verrou du mode Officiel** : tant qu'il est fermé, le logiciel ne peut pas être pris
   pour un registre opposable ; sa réouverture est une décision écrite, pas une manipulation.
2. **Le poste est chiffré** et son accès physique contrôlé.
3. **Les sauvegardes sont faites, sorties du poste et vérifiées** — une restauration au moins
   a été réellement essayée, pas seulement configurée.
4. **La base vive n'est pas dans un dossier synchronisé** (le logiciel le refuse par défaut,
   `server/db.js:89` ; cette garde ne doit pas être levée).
5. **La mise en service n'a lieu qu'après un fonctionnement en parallèle du registre
   existant**, celui-ci restant la référence pendant tout le pilote.

Si l'une de ces conditions n'est pas tenue, on ne peut plus se prévaloir de ce que décrit le
§ 1. Le § 1 ne décrit pas des garanties — le logiciel est fourni sans garantie (§ 5) — mais
des **fonctions** ; et ces fonctions ne produisent leur effet que si les cinq conditions
ci-dessus sont tenues.

## 5. Statut de l'auteur

L'auteur est **enseignant** en froid et climatisation au lycée professionnel Jacques Raynaud
(Marseille). Il a écrit ce logiciel pour son atelier et **l'exploite lui-même**. Il n'est ni
éditeur de logiciel, ni bureau d'études, ni juriste.

Le logiciel est fourni **en l'état**, sous licence **PolyForm Noncommercial 1.0.0** (voir
`LICENSE`) : libre et gratuit pour l'enseignement, les administrations et les associations ;
licence distincte pour tout usage commercial. **Ce n'est pas un produit commercial : ni
garantie, ni support contractuel, ni engagement de correction dans un délai donné.**

## 6. Prudence

Ce document **n'est pas un avis juridique**. Il gagne à être relu par la direction de
l'établissement et, si elle le juge utile, par un conseil. Il ne dispense d'aucune
vérification que l'établissement estimerait nécessaire.

---

*Franck Henninot — inerweb.fh@gmail.com. Documents liés : `LICENSE`, `SECURITE.md`,
`RGPD.md`, `SAUVEGARDE.md`, `docs/POINTS-DE-FRICTION.md` (limites connues, une par une),
`docs/REGISTRE-DES-ARBITRAGES.md` (les valeurs réglementaires et ce sur quoi elles reposent),
`docs/NOTE-DECISION-ETABLISSEMENT.md` (la décision à signer),
`docs/T3-DOSSIER-RELECTURE-EXTERNE.md` (les onze questions restées sans réponse).*
