# Limite de responsabilité — inerWeb Fluide

> **Logiciel** : inerWeb Fluide 8.0.0-dev, état du dépôt au commit `1cd457a` (26/07/2026).
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
autres documents sortent sans marque** : aucun module de `v8/js/documents/` n'emploie le mot
« FORMATION ». C'est une limite réelle, pas une nuance de rédaction : elle est décrite au
§ 2 g), et elle appelle une décision.

Vérification par soi-même : `node outils/lancer-tests.mjs --tout` (filet complet) et
`node server/test-securite-negative.mjs` (les refus, réellement exécutés contre un serveur,
sur un port et une base jetables).

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
horodatage qualifié**.

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
(`v8/js/cerfa/generateur.js:93`, `:538`, `:754`). Le bon d'intervention, le dossier machine,
le dossier client, le dossier de fuite, le dossier d'audit, la plaque F-Gas, les étiquettes,
la feuille de mise en service et les exports sortent **sans aucune marque distinctive** : la
chaîne « FORMATION » n'apparaît dans aucun module de `v8/js/documents/` (vérification :
`grep -r FORMATION v8/js/documents/`). Un document produit pendant un cours ressemble donc
à un document produit pour de bon.

C'est **un défaut du logiciel**, et il appelle une décision de l'établissement : soit marquer
tout document produit hors mode Officiel, soit encadrer par consigne écrite la sortie de ces
documents hors de l'atelier. Tant que ce n'est pas tranché, ces documents ne doivent pas être
remis à un tiers.

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
