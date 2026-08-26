# Sources techniques — Bouteille liquide

Références vérifiées le 4 août 2026. Les faits sont reformulés ; aucune illustration constructeur
n’est reproduite.

## Copeland — Refrigeration System Components

- Source primaire : https://www.copeland.com/documents/refrigeration-system-components-en-ca-6653618.pdf
- Faits retenus : le receiver est principalement un réservoir de stockage du fluide liquide ; une
  vanne à sa sortie permet le pump-down ; la sortie doit conserver une garde liquide et utilise un
  tube plongeur lorsqu’elle se situe en partie haute ou latérale.
- Utilisation : écrans 3 à 7.

## Copeland — Installation and Service

- Source primaire : https://media.copeland.com/331829a2-8a7f-4c91-af27-b1aa0118eaa3/AE105-Installation%20and%20Service.pdf
- Faits retenus : sur une installation munie de vannes de service, un pump-down peut rassembler le
  fluide dans le condenseur et le receiver ; le principe décrit consiste à interrompre la sortie
  liquide pendant que le compresseur retire le fluide de l’évaporateur.
- Utilisation : écran 9, présenté volontairement sans valeurs ni procédure universelle.

## Copeland — Design Considerations for Refrigerant Receivers

- Source primaire : https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEB&PDF=1212
- Faits retenus : une chute de pression à la sortie du receiver ou dans sa vanne peut contribuer à
  la formation de flash-gaz ; une conception à tube plongeur dispose de peu de hauteur liquide si le
  niveau est bas.
- Utilisation : écrans 5 et 10.

## BITZER — Liquid receivers et raccordements

- Source primaire : https://www.bitzer.de/shared_media/html/at-320/en-GB/715713291715714827.html
- Complément : https://www.bitzer.de/us/us/liquid-receivers/standing-models-for-condensing-units/
- Faits retenus : les configurations d’entrée et de sortie varient selon les réservoirs ; la sortie
  peut être équipée d’une vanne Rotalock avec raccord de service ; des modèles verticaux et
  horizontaux existent avec des équipements propres.
- Utilisation : écrans 1, 6 à 8 et 12.

## Danfoss — Pump-down par électrovanne

- Source primaire pump-down : https://assets.danfoss.com/documents/latest/521098/AB196386425654en-021801.pdf
- Faits retenus : une électrovanne liquide commandée peut interrompre l’alimentation de
  l’évaporateur ; le compresseur retire le fluide de la basse pression puis le pressostat BP arrête
  le compresseur selon la conception de l’installation.
- Utilisation : écran 9.

## Danfoss — Liquide piégé

- Source primaire : https://assets.danfoss.com/documents/latest/470491/AB137786416217en-000801.pdf
- Fait retenu : du liquide réfrigérant piégé entre des organes fermés peut atteindre une pression
  excessive lors de son échauffement et doit être protégé par la conception appropriée.
- Utilisation : écran 13.

## Union européenne — DESP 2014/68/UE

- Texte consolidé : https://eur-lex.europa.eu/eli/dir/2014/68/oj
- Présentation officielle : https://single-market-economy.ec.europa.eu/sectors/pressure-equipment-and-gas-appliances/pressure-equipment-sector/pressure-equipment-directive_en
- Faits retenus : la directive concerne la conception, la fabrication et l’évaluation de conformité
  des équipements sous pression dont la pression maximale admissible PS dépasse 0,5 bar ; les
  soupapes et dispositifs à disque de rupture figurent parmi les accessoires de sécurité. Le marquage
  permanent comprend notamment l’année de fabrication, l’identification de l’équipement et ses limites
  essentielles admissibles ; selon le type, il peut aussi indiquer V, PT et sa date, la pression de
  réglage d’un dispositif de sécurité, le fluide ou son groupe et d’autres données d’usage.
- Utilisation : écran 13.

## France — suivi en service des équipements sous pression

- Texte consolidé en vigueur : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000036128632
- Faits retenus : le suivi en service est encadré par l’arrêté du 20 novembre 2017 ; l’applicabilité
  et les opérations requises dépendent des caractéristiques et du dossier de l’équipement.
- Utilisation : écran 13, sans présenter de calendrier ou seuil universel.

## Danfoss et Copeland — soupape, disque et bouchon fusible

- Soupape de sécurité Danfoss SFV : https://designcenter.danfoss.com/products/climate-solutions-for-cooling/valves/safety-relief-valves/safety-relief-valves/sfv
- Bouchon fusible Danfoss : https://assets.danfoss.com/documents/latest/160253/AO367855030647en-010101.pdf
- Manuel Copeland : https://webapps.copeland.com/online-product-information/Publication/LaunchPDF?Index=AEM&PDF=AE-102
- Faits retenus : une soupape limite la pression par ouverture tarée ; un disque de rupture est un
  dispositif à usage unique ; le bouchon fusible réagit à la chaleur d’un incendie et non directement
  à la pression, et ne constitue pas à lui seul une protection primaire universelle contre la surpression.
- Utilisation : écran 13.

## Validation interne — prises P et P1 de la vanne Rotalock étudiée

- Source locale : `../vanne-rotalock-pedagogique/valve-diagram.js` et les SVG validés du même module.
- Faits retenus : P, proche du carré, est la voie de service temporaire ; P1, à l’opposé, est la voie
  permanente du pressostat et peut rester sous pression selon la position de la vanne.
- Utilisation : écrans 7 et 8.

## Référence pédagogique fournie par le demandeur

- Vidéo : « Leçon N°29 : La bouteille de liquide BL » —
  https://www.youtube.com/watch?v=my2PVGM7IMM
- Statut : référence documentaire pour confronter la représentation générale de la bouteille ;
  aucune image, séquence sonore ni transcription n’est intégrée.
- Utilisation : contrôle visuel de l’entrée latérale, du départ supérieur et de la continuité du tube
  plongeur. Les affirmations techniques du module restent étayées par les sources primaires ci-dessus.

## Limite de validation

Le module décrit une architecture générique. Avant de l’associer à un produit précis, vérifier sa
notice, le fluide, les pressions admissibles, le volume utile, l’orientation, la communication de la
prise de service et les accessoires de sécurité.
