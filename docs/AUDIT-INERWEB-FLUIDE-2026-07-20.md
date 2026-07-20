# Audit complet d’inerWeb Fluide — version du 20 juillet 2026

## 1. Verdict exécutif

**Verdict de mise en production : NO GO comme registre réglementaire officiel unique, en l’état.**

La version auditée possède un socle de preuve inhabituellement sérieux pour un logiciel local : écritures validées verrouillées, corrections par contre-écritures, empreintes chaînées, journal append-only, doubles signatures réelles, PDF CERFA final conservé et haché, scellement externe quotidien, sauvegardes vérifiées et séparation Formation/Officiel. Les 85 exécutions de tests fournies passent toutes.

En revanche, cinq écarts métier empêchent encore de considérer le mode Officiel comme juridiquement sûr :

1. un fluide seulement récupéré peut être déclaré « réutilisable » puis rechargé sans recyclage ou régénération prouvé ;
2. le blocage officiel vérifie l’existence d’une aptitude active, mais pas que sa catégorie autorise le fluide, l’opération et la charge concernés ;
3. une réparation et son contrôle de suivi peuvent être clôturés le même jour sur un équipement fixe, sans attendre 24 heures de fonctionnement ;
4. un contrôle d’étanchéité autonome est créé en mode Formation par défaut et n’emprunte pas le parcours officiel signé/WORM ;
5. l’écran présenté comme déclaration annuelle ADEME ne contient pas les rubriques exigées par le nouvel arrêté du 21 novembre 2025.

| Usage envisagé | Avis |
|---|---|
| Démonstration avec données fictives | **Oui** |
| Formation pédagogique | **Oui**, sous réserve d’une politique RGPD locale |
| Pilote réel tenu en doublon d’un registre de référence | **Oui**, après traitement du risque de fluide récupéré et uniquement en loopback |
| Registre officiel principal/unique | **Non**, jusqu’à clôture des priorités P0 |
| Accès depuis tablettes sur le LAN | **Non en HTTP** ; HTTPS ou suppression du mode LAN nécessaire |

Recommandation immédiate : remettre temporairement `VERROU_LIVRAISON = true` tant que les priorités P0 de la section 10 ne sont pas corrigées et testées.

## 2. Périmètre et méthode

- Archive auditée : `inerweb-fluide-audit.zip`
- SHA-256 : `DD66CFB8A407272AAC5BEC22B8B986C25C6501E1277C5E62C0CD8A28725EE61F`
- Taille : 11 579 049 octets ; 285 entrées ; aucune traversée de chemin détectée à l’extraction.
- Copie d’analyse : `_audit_innerweb_fluide_2026-07-20/`
- Audit statique : serveur Node/SQLite, contrat métier, moteur réglementaire, CERFA, sauvegardes, sécurité, RGPD, documentation et code Apps Script historique.
- Audit dynamique : `node outils/lancer-tests.mjs --tout` — **85/85 exécutions vertes**, 0 échec, environ 48 secondes.
- Référentiel juridique consulté au 20 juillet 2026 : règlement (UE) 2024/573, textes français en vigueur et nouveaux arrêtés du 21 novembre 2025, RGPD/CNIL.

Limite : cet audit n’est ni une certification juridique, ni une homologation ANSSI, ni un pentest exhaustif. La conformité finale appartient à l’opérateur et à son DPD ; la matrice métier doit idéalement être relue par l’organisme agréé qui délivre l’attestation de capacité.

## 3. Cheminement complet du fluide

| Étape/cas | Ce que fait l’application | Exigence/résultat d’audit | Verdict |
|---|---|---|---|
| Entrée d’une bouteille neuve | Identifie bouteille, fluide, lot, fournisseur, tare, masse et date ; la masse d’entrée alimente les achats | Bonne base, mais BL/facture et preuve fournisseur restent facultatifs ; aucune réception partielle structurée | À renforcer |
| Mise en service/appoint | Machine et bouteille compatibles, pesées avant/après, quantité calculée, pas de stock négatif ni de surcharge, contrôle lié possible | Très bon verrouillage physique et transactionnel | Bon |
| Appoint en fluide vierge PRP ≥ 2 500 | Blocage officiel sec | Protecteur, mais ne distingue pas réfrigération, climatisation/PAC, usages dérogatoires et dates propres à chaque cas | Incomplet |
| Charge avec fluide recyclé/régénéré | États `RECYCLE` et `REGENERE` disponibles | Il manque l’installation, l’adresse, le certificat, le lot et les conditions de réemploi du recyclé à PRP élevé | Majeur |
| Récupération maintenance/démantèlement | Bouteille de récupération obligatoire, croisement et débordement bloqués, quantité négative, machine décrémentée | Très bon suivi masse/contenant | Bon |
| Réemploi du fluide récupéré | Décision manuelle « Réutilisable — fluide propre » puis recharge autorisée | Le règlement interdit le remplissage avec du gaz seulement récupéré : il doit être recyclé ou régénéré. Le serveur n’exige même pas systématiquement la décision `REUTILISABLE` | **Critique** |
| Mélange/doute | Mélange confiné vers bouteille Mélange et filière déchets ; charge depuis Mélange bloquée | Bonne idée. L’état `DOUTEUX` doit cependant être explicitement bloqué côté serveur | À corriger |
| Transfert bouteille à bouteille | Mouvement interne sans CERFA, neutre dans la balance, compatibilités contrôlées | Cohérent ; la traçabilité est conservée | Bon |
| Fuite détectée | Dossier de fuite, machine en statut Fuite, appoint bloqué avant réparation, réparation tracée | Bonne modélisation du dossier | Bon |
| Contrôle après réparation | Échéance calculée à +30 jours ; contrôle conforme le jour même accepté | Le texte impose au plus tôt après 24 h de fonctionnement et au plus tard un mois, sauf équipements mobiles listés | **Critique** |
| Contrôle périodique autonome | Enregistrement séparé, numéro `C-FORM`, génération d’un CERFA Formation | Pas de véritable parcours officiel autonome avec aptitude, signatures, PDF final conservé et WORM | **Critique** |
| Déchet/BSFF | Décision Déchet, numéro BSFF, transporteur/destination, masse remise, PJ possible | Le BSFF est saisi manuellement et ne remplace pas Trackdéchets. Toute masse BSFF est comptée à tort comme « détruite », alors qu’elle peut être recyclée ou régénérée | Majeur |
| Retour fournisseur | Bouteille sortie du stock et masse portée en retour | Bon mécanisme, à renommer/distinguer selon remise au distributeur vs retour de contenant | Bon/incomplet |
| Cession à un tiers | Colonne prévue dans la balance | Toujours égale à zéro ; aucun workflow de cession | Majeur |
| Inventaire annuel | Stock initial, achats, récupérations, charges, retours, BSFF, stock théorique/réel, justification d’écart | Excellente balance interne, mais différente de la déclaration annuelle réglementaire | Bon outil interne |
| Correction d’une erreur | Annulation par contre-écriture, jamais par modification de la ligne validée | Très bon principe probatoire | Très bon |

## 4. F-Gas III — ce qui est correctement anticipé

### 4.1 Seuils et périodicités

Le moteur applique correctement :

- gaz de l’annexe I : contrôle à partir de 5 tCO₂e, puis paliers 50/500 tCO₂e ;
- HFO de l’annexe II section 1 : contrôle à partir de 1 kg, puis paliers 10/100 kg ;
- fréquences 12/6/3 mois, doublées à 24/12/6 mois avec détection permanente ;
- formule `kg × PRP / 1000` ;
- R-1234yf corrigé à 0,501 ;
- catégorisation explicite HFC/HFO et valeurs figées dans les écritures ;
- R-455A traité comme mélange contenant un HFC, donc selon les tCO₂e.

Le PRP du R-455A est cependant conservé à 148 alors que la composition et les valeurs actuelles conduisent à environ 145,53, couramment arrondi à 146. Le choix 148 est conservatoire et change rarement une décision, mais un registre réglementaire doit utiliser la valeur de référence exacte plutôt qu’une « réserve DGPR » durable.

### 4.2 Périmètre et exemptions manquants

La fiche machine ne sait pas décrire :

- fixe ou mobile et sous-type d’équipement ;
- réfrigération, climatisation, PAC, refroidisseur, véhicule, etc. ;
- hermétiquement scellé **et étiqueté comme tel** ;
- installation résidentielle ;
- système de détection obligatoire, date de vérification et résultat.

Conséquences :

- les exemptions des équipements hermétiquement scellés ne peuvent pas être calculées ;
- les exceptions propres aux équipements mobiles ne peuvent pas être appliquées ;
- l’installation obligatoire d’une détection à ≥ 500 tCO₂e ou ≥ 100 kg HFO n’est pas bloquée ;
- la vérification annuelle de cette détection n’est pas suivie ;
- le contrôle après réparation ne peut pas distinguer un équipement fixe d’un mobile autorisé au contrôle immédiat.

Le comportement actuel est souvent conservatoire — il exige parfois un contrôle non nécessaire — mais il n’est pas juridiquement explicable au cas par cas.

### 4.3 Aptitudes : moteur de conseil correct dans l’idée, verrou officiel insuffisant

Le mode Officiel ne vérifie que : « au moins une habilitation active et non expirée ». Une catégorie E/IV, limitée au contrôle d’étanchéité sans ouverture du circuit, peut donc satisfaire le blocage avant une charge ou une récupération. Une catégorie D/III peut également être acceptée pour une opération qu’elle ne couvre pas.

Deux erreurs existent en outre dans le moteur de conseil :

- l’ancienne catégorie II est modélisée sans limite de charge, alors qu’elle est limitée à moins de 3 kg ou moins de 6 kg si le système est hermétiquement scellé et étiqueté ;
- les comparaisons acceptent exactement 3 kg et 6 kg (`>`), alors que le texte dit **inférieure à** 3/6 kg : il faut refuser `>=`.

La transition 2027 est bien identifiée, mais l’application ne calcule pas le cycle complet : remise à niveau ponctuelle des anciennes catégories avant le 12 mars 2029, puis remise à niveau périodique au moins tous les sept ans, suspension et invalidation en cas de dépassement.

### 4.4 Restrictions d’usage des gaz à fort PRP

Le blocage `PRP ≥ 2500 + source vierge` est utile mais trop général. Le règlement distingue notamment :

- réfrigération : interdiction du vierge ≥ 2 500 depuis le 1er janvier 2025 ;
- climatisation/PAC : interdiction depuis le 1er janvier 2026 ;
- exemptions militaires, très basse température et exemptions autorisées ;
- réfrigérant recyclé/régénéré autorisé sous conditions et jusqu’à des dates différentes ;
- futur palier de PRP 750 en 2032 pour certaines réfrigérations fixes.

Sans type d’équipement, provenance, installation de régénération, entreprise ayant récupéré le gaz et étiquetage, le logiciel ne peut pas appliquer ces règles proprement.

### 4.5 Référentiel des fluides

Le référentiel de neuf fluides est trop court pour une diffusion professionnelle : R-448A, R-449A, R-452A, R-452B, R-454A/B/C, R-513A, R-1234ze, R-717 et d’autres cas usuels manquent. Il n’existe pas d’écran normal d’administration du référentiel.

Un fluide importé hors référentiel explicite peut tomber dans des replis de famille ou de PRP insuffisamment sûrs. Il faut une table versionnée, issue d’une source unique, avec composition, annexe, PRP réglementaire, classe de sécurité, dates d’effet et journal des révisions.

## 5. Registre équipement et CERFA

### Points forts

- CERFA 15497*04 officiel embarqué ;
- numérotation séparée Formation/Officiel ;
- double signature réelle technicien puis détenteur, liée à la révision ;
- toute modification rend les signatures périmées ;
- PDF final conservé comme pièce système, empreinte incluse dans la chaîne ;
- pièces jointes et signatures prises dans l’empreinte v2 ;
- copies et écritures conservées au moins cinq ans dans le fonctionnement courant.

### Informations structurées encore manquantes au regard de l’article 7

Pour chaque équipement soumis aux contrôles, le registre devrait aussi pouvoir restituer sans interprétation :

- origine recyclée ou régénérée de chaque quantité ajoutée ;
- nom et adresse de l’installation de recyclage/régénération ;
- numéro de certificat le cas échéant ;
- identité et certificat de l’entreprise intervenante quand elle est distincte de l’établissement ;
- mesures prises pour récupération et traitement lors de la mise hors service ;
- type exact de traitement final : recyclage, régénération ou destruction.

Des pièces jointes libres ne remplacent pas ces champs : elles ne sont ni filtrables, ni totalisables, ni contrôlables automatiquement.

### Contrôles autonomes

`createControle` accepte techniquement un champ `mode`, mais l’interface ne le fournit pas et le serveur retombe sur `FORMATION`. Un appel API forgé peut inversement créer un contrôle marqué `OFFICIEL` sans passer par les blocages, signatures et conservation du PDF. Il faut transformer le contrôle autonome en écriture officielle de premier rang, ou le faire passer par le même agrégat WORM qu’un mouvement.

## 6. Déclaration annuelle et balance matière

La balance matière interne est bien pensée : stock initial neuf/récupéré, achats, récupérations, charges, retours, inventaire réel et justification des écarts.

L’écran « Tableau de suivi réglementaire par fluide — déclaration ADEME » n’est toutefois **pas** une déclaration conforme au nouvel arrêté. Il ne produit que charge, récupération et charge en parc. À compter du nouveau régime, il faut distinguer par fluide :

1. acquisitions ;
2. charges en équipements neufs ;
3. charges de maintenance ;
4. récupérations sur équipements hors d’usage ;
5. récupérations de maintenance ;
6. remises à un distributeur ;
7. recyclage sous responsabilité propre ;
8. régénération, avec coordonnées de l’installation ;
9. destruction, avec coordonnées de l’installation ;
10. cessions à un opérateur attesté, distributeur ou producteur ;
11. stocks au 1er janvier et au 31 décembre, séparés en fluide neuf et déchets.

Deux erreurs de sens sont à corriger en priorité :

- `cessions_kg` est codé à zéro ;
- toute masse remise sous BSFF est comptée comme détruite, alors que le BSFF constate une remise de déchet, pas le procédé final de traitement.

Le libellé « déclaration ADEME » doit être retiré tant que l’export n’est pas complet et validé par l’organisme agréé.

## 7. Sécurité du code

### Solide

- écoute loopback par défaut ;
- garde Host/Origin contre CSRF et DNS rebinding ;
- sessions de huit heures, jetons 32 octets aléatoires stockés sous empreinte SHA-256 ;
- cookies HttpOnly et SameSite Strict ;
- mots de passe scrypt avec sel unique et comparaison constante ;
- verrou après cinq échecs ;
- rôles serveur, révocation des sessions lors d’une désactivation ou d’un changement de rôle ;
- requêtes SQLite paramétrées ;
- CSP HTTP stricte, anti-clickjacking et `nosniff` ;
- limites de taille et protections de chemins des pièces jointes ;
- transactions tout-ou-rien ;
- triggers WORM, chaîne du registre et chaîne du journal ;
- restauration et archives réellement vérifiées.

Le scan de la présente archive n’a trouvé aucun secret de production en clair. Les littéraux ressemblant à des mots de passe sont dans les tests. `apps-script/.clasp.json` contient toutefois un identifiant réel de projet Apps Script : ce n’est pas une clé d’accès, mais cet artefact de déploiement ne devrait pas être dans le paquet public.

### À corriger

#### LAN en HTTP — majeur

Le serveur utilise `http.createServer`. En mode `IWF_LAN=1`, les origines autorisées sont explicitement `http://…` et le cookie ne peut pas recevoir l’attribut Secure. Identifiants, cookies, signatures et données personnelles circulent donc en clair sur le réseau local. La qualification « réseau semi-fiable » ne suffit pas.

Correctif : désactiver le LAN tant qu’un frontal HTTPS n’est pas prévu, ou intégrer HTTPS avec certificat géré par l’établissement, redirection HTTP→HTTPS et cookie Secure. Les gestes du coffre déjà limités au poste local sont une bonne mesure mais ne règlent pas le reste.

#### Racine HTTP trop large — moyen

Le serveur statique publie la racine complète du dépôt et bloque seulement quelques premiers segments. Le code Apps Script historique, la documentation, le changelog, `.env.example` et l’identifiant `.clasp.json` peuvent être servis, notamment sur le LAN. Servir uniquement un répertoire de distribution explicitement allowlisté.

#### Hachage des mots de passe — moyen

Le réglage scrypt est `N=2^15, r=8, p=1`. La recommandation OWASP minimale équivalente utilise `N=2^17,r=8,p=1`, ou augmente `p` quand `N` est plus faible. Prévoir une version du format de hash et un rehash progressif à la connexion.

#### Sauvegardes et OneDrive — majeur opérationnel

Les archives automatiques sont en clair et la base SQLite est en clair. Le code avertit si `data/` est sous OneDrive/Dropbox, mais n’empêche pas le démarrage. Dans un lycée :

- imposer BitLocker ou chiffrement équivalent du poste ;
- interdire le lancement si la base vive se trouve dans un dossier synchronisé, sauf dérogation explicite ;
- chiffrer toute copie amovible ou hors site ;
- appliquer la rétention aux anciennes sauvegardes nominatives.

#### Incident des clés v7 — critique tant que non prouvé clos

La documentation reconnaît que trois clés Apps Script v7 ont été publiées dans un dépôt public. Elles ont disparu du code courant, mais seule leur révocation côté déploiement clôt l’incident. L’archive ne permet pas de prouver cette révocation.

Exiger une preuve datée : un appel avec chacune des anciennes clés doit échouer, les nouvelles clés doivent être dans Script Properties, et l’ancien déploiement doit être désactivé ou redéployé. Si ce test n’a jamais été fait, considérer la base v7 potentiellement compromise.

#### Maintenabilité — moyen

`server/api.js` et `v8/js/data/demo-store.js` dupliquent des milliers de lignes de règles métier. Plusieurs miroirs sont testés, mais cette architecture favorise les dérives. Les 85 tests sont précieux, sans mesure de couverture ni lint/type checking. Extraire un noyau de domaine partagé et versionné : calculs F-Gas, aptitude, cycle fuite, bilan, invariants de contenants et sérialisation canonique.

## 8. RGPD

### Bons éléments

- traitement local sans télémétrie ni envoi à l’auteur ;
- responsable de traitement correctement attribué à l’établissement ;
- rôles et journal d’audit ;
- page d’information visible ;
- export individuel ;
- coffre AES-256-GCM avec pseudonymisation, motif d’ouverture et journalisation ;
- séparation du mode Formation et du mode Officiel ;
- documentation honnête des résidus identifiants.

### Écarts

#### Mention d’information incomplète — majeur

Le nom de l’établissement ne suffit pas. La notice doit être paramétrable avec :

- identité **et coordonnées** du responsable de traitement ;
- coordonnées du DPD ;
- destinataires/catégories de destinataires ;
- droit de réclamation auprès de la CNIL ;
- caractère obligatoire ou facultatif des données et conséquence d’un refus ;
- sources des données lorsqu’elles ne viennent pas directement de la personne ;
- coordonnées et garanties d’un éventuel hébergeur/sous-traitant.

L’écran affirme aussi un mode Cloud UE alors que le README le décrit comme prévu et que le serveur audité n’implémente pas Supabase. Cette promesse doit disparaître tant que l’architecture, le contrat de sous-traitance et les transferts ne sont pas effectivement maîtrisés.

#### Durées de conservation — majeur

Le document annonce les écritures Formation « conservées sans limite ». Le scellement d’un journal est un choix d’architecture, pas en lui-même une obligation légale de conservation illimitée. La pseudonymisation réversible reste une donnée personnelle.

Définir avec le DPD : durée de base active, archivage intermédiaire à accès restreint, durée maximale et sort final pour chaque catégorie. Pour les fiches réglementaires, le texte impose au moins cinq ans ; une durée supérieure doit avoir un fondement et des critères documentés. Les archives publiques peuvent imposer un traitement spécifique distinct.

#### Export individuel incomplet — moyen/majeur

L’export exclut volontairement les images de signature, scans d’attestation et événements du journal. Or le droit d’accès porte sur une copie des données personnelles traitées, sous réserve des droits de tiers. Le bouton doit soit produire un paquet complet sécurisé, soit guider l’administrateur dans une procédure complémentaire incluant les binaires et les extraits de journal pertinents.

Le terme « portabilité » est trop large : l’article 20 s’applique surtout aux traitements fondés sur le consentement ou le contrat, et non à la mission d’intérêt public annoncée ici. Présenter d’abord l’outil comme une réponse au droit d’accès.

#### Effacement/limitation — moyen

La mise au coffre est une bonne mesure de réduction d’accès, pas un effacement ni une anonymisation. Elle reste manuelle et laisse noms, signatures, PDF, journal, pièces et anciennes sauvegardes. L’interface doit distinguer clairement : désactivation, limitation, archivage, pseudonymisation, effacement et anonymisation irréversible.

### Livrables organisationnels indispensables

Le logiciel ne peut pas fournir à lui seul :

- l’inscription au registre des traitements ;
- la validation du DPD et, si nécessaire, l’analyse d’impact ;
- la note d’information remise aux personnels, élèves et responsables légaux ;
- la procédure d’exercice des droits sous un mois ;
- la politique d’habilitation, de départ des comptes et de revue annuelle ;
- la procédure de violation de données ;
- la politique de sauvegarde, restauration, rétention et destruction ;
- les accords de sous-traitance/hébergement éventuels.

## 9. Documentation et cohérence de livraison

Plusieurs documents décrivent des états incompatibles :

- le code ouvre le mode Officiel (`VERROU_LIVRAISON=false`) ;
- le README indique « Mode Officiel : pas encore » ;
- le document des conditions dit encore que le mode reste fermé ;
- `.env.example` propose `MODE`, `SUPABASE_*`, `SAUVEGARDE_AUTO` et `SAUVEGARDE_CHIFFREE`, mais le lanceur ne charge pas `.env` et ces options ne pilotent pas le serveur audité ;
- la politique de sécurité dit loopback uniquement alors que le code permet le LAN.

Cette incohérence est dangereuse en audit : le mode réellement utilisé ne peut pas être prouvé à partir de la documentation. Générer une documentation de version à partir de constantes testées et supprimer les options non implémentées.

## 10. Plan de correction priorisé

### P0 — avant toute réouverture du mode Officiel

1. **Re-bloquer le mode Officiel.**
2. **Interdire côté serveur toute charge depuis un état autre que `VIERGE`, `RECYCLE` ou `REGENERE`.** Supprimer la décision générique `REUTILISABLE` ou la transformer en workflow prouvé de recyclage.
3. **Tracer le traitement du gaz** : type, date, lot, analyse/qualité, entreprise, installation, adresse, certificat, pièce justificative et provenance de la récupération.
4. **Brancher la matrice d’aptitude comme blocage dur** : catégorie × opération × famille × charge × hermétique × date du régime ; corriger les frontières `>= 3` et `>= 6` et l’ancienne catégorie II.
5. **Corriger le cycle fuite** : équipement fixe/mobile, horodatage et preuve des 24 h de fonctionnement, borne d’un mois calendaire, exception mobile explicite.
6. **Créer un vrai contrôle autonome officiel** : mêmes contrôles de droits, signatures, WORM, PDF final et contre-écriture que les mouvements.
7. **Remplacer le pseudo-bilan ADEME** par la déclaration complète du nouvel arrêté ; ne jamais assimiler BSFF à destruction.
8. **Prouver la révocation des anciennes clés v7.**

### P1 — avant diffusion réelle large

9. Ajouter type/scope de machine, hermétique + étiquette, résidentiel, détection obligatoire et contrôles du détecteur.
10. Versionner et compléter le référentiel des fluides ; corriger R-455A à la valeur réglementaire retenue.
11. Implémenter cessions, remise distributeur et traitement final distinct.
12. Compléter la notice RGPD, les durées, le paquet d’accès individuel et la procédure de limitation.
13. Supprimer le LAN HTTP ou fournir HTTPS obligatoire.
14. Chiffrer le poste et les sauvegardes externes ; bloquer la base vive sous synchronisation cloud.

### P2 — industrialisation

15. Extraire un moteur de domaine partagé front/serveur.
16. Ajouter couverture de tests, lint, analyse statique et tests de sécurité négatifs.
17. Mettre à niveau scrypt avec migration progressive.
18. Servir une distribution HTTP allowlistée, sans code historique ni métadonnées de déploiement.
19. Aligner README, sécurité, RGPD, installation et configuration sur les fonctionnalités réellement livrées.

## 11. Tests d’acceptation à ajouter

- catégorie E/IV + charge : refus officiel ;
- catégorie D/III + autre chose que récupération : refus ;
- ancienne II et nouvelle A2 : 2,999 kg accepté, 3,000 kg refusé ; hermétique étiqueté 5,999 accepté, 6,000 refusé ;
- ancienne aptitude sans remise à niveau le 12 mars 2029 : refus ; périodique de sept ans dépassée : suspension ;
- bouteille `RECUPERE`, `DOUTEUX` ou `MELANGE` comme source de charge : refus serveur ;
- bouteille `RECYCLE/REGENERE` sans provenance ou certificat requis : refus ;
- PRP ≥ 2 500 recyclé : vérifier l’entreprise ayant récupéré et la date limite de dérogation ;
- équipement fixe : contrôle après réparation le jour même et avant 24 h de fonctionnement refusé ; après 24 h accepté ; après un mois calendaire refusé ;
- équipement mobile éligible : contrôle immédiat accepté avec motif de périmètre ;
- contrôle officiel autonome : aptitude, signatures, PDF final et WORM obligatoires ;
- hermétique non étiqueté : exemption refusée ; détection obligatoire absente : blocage ; détecteur non vérifié depuis 12 mois : alerte/blocage ;
- BSFF sans attestation de traitement : ne pas compter en destruction ;
- déclaration annuelle : chaque rubrique du texte réconciliée avec le stock initial/final ;
- export d’accès : inclure ou lister explicitement signatures, scans et événements personnels ;
- démarrage LAN sans HTTPS : refus ; démarrage sous OneDrive : refus explicite ou dérogation journalisée.

## 12. Sources juridiques et techniques principales

- [Règlement (UE) 2024/573 — texte consolidé](https://eur-lex.europa.eu/eli/reg/2024/573/2024-02-20/eng)
- [Code de l’environnement, article R. 543-82](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000031790617/2022-10-19)
- [Arrêté du 29 février 2016, article 11 — CERFA 15497](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049885053)
- [Arrêté du 21 novembre 2025 — attestations de capacité, article 1](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000052996998)
- [Arrêté du 21 novembre 2025 — attestations d’aptitude](https://www.legifrance.gouv.fr/loda/id/JORFTEXT000053004604/)
- [CNIL — droits et informations, articles 13 à 21 du RGPD](https://www.cnil.fr/fr/reglement-europeen-protection-donnees/chapitre3)
- [CNIL — durées de conservation](https://www.cnil.fr/fr/passer-laction/les-durees-de-conservation-des-donnees)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [Honeywell — composition et PRP du R-455A](https://www.honeywell-refrigerants.com/europe/product/solstice-l40x/)

## 13. Conclusion

inerWeb Fluide dispose déjà d’un **excellent moteur de traçabilité probatoire**. Le risque actuel ne vient pas principalement du hash, des signatures ou de SQLite ; il vient de la traduction incomplète de quelques règles métier en blocages serveur.

La meilleure trajectoire est courte et claire : fermer provisoirement le mode Officiel, sécuriser le cycle `récupéré → recyclé/régénéré → réemploi`, rendre la matrice d’aptitude réellement opposable, corriger le suivi après fuite, donner aux contrôles autonomes un vrai parcours officiel, puis reconstruire la déclaration annuelle selon le texte 2025. Après ces six chantiers et une relecture par l’organisme agréé/DPD, le produit pourra raisonnablement viser le statut de registre principal.
