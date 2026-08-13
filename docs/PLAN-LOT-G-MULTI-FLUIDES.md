# Plan lot G (13/08/2026, carte blanche) — équipements à plusieurs fluides (cascades)

> Constat de la 4e relecture externe (27/07), TIRÉ : une machine en cascade n'a qu'un
> champ `fluide` — déclarée R-744 avec 8 kg au total, le moteur rend « aucun contrôle »
> alors que le seul circuit HFC (R-134a, 4 kg = 5,72 tCO₂eq) impose 12 mois. Le doute
> retirait une OBLIGATION entière.

## Ce qui est FAIT (13/08, sans décision réglementaire nouvelle)

Le défaut ne vit pas dans le moteur — pour une machine réellement au CO₂ pur, « aucun
contrôle d'étanchéité fluoré » est la bonne réponse. Il vit dans la DÉCLARATION : deux
circuits rangés dans une seule fiche. Or la pratique réglementaire s'apprécie PAR
CIRCUIT, et le logiciel sait DÉJÀ la porter : une fiche machine par circuit, chacune
avec son fluide, sa charge nominale et ses échéances (`JR-CF-001` circuit HT R-744,
`JR-CF-002` circuit BT R-134a).

- **Le mode d'emploi du piège est fermé** : le champ Fluide du formulaire machine porte
  désormais la règle, dans le bloc du champ (règle des notes, revue B1) — « une fiche =
  un seul circuit ; un équipement à plusieurs circuits se déclare circuit par circuit ».
  Prouvé par `test-formulaires-reserves`.

## Ce qui reste GATÉ FRANCK (décision de fond — ne pas coder sans lui)

Deux chemins possibles, à trancher sur la pratique d'atelier :

- **(A) Entériner « un circuit = une fiche »** et l'outiller : un champ optionnel
  « ensemble » (grappe) qui relie les fiches d'un même équipement pour l'affichage
  (fiche machine, QR, dossier d'audit) — AUCUN changement de moteur, une migration
  légère, pas de règle nouvelle. Recommandé : c'est la lecture par circuit du contrôle
  d'étanchéité, et le CERFA d'une intervention reste par circuit.
- **(B) Modèle multi-circuits** : table `machine_circuits` (fluide, charge nominale par
  circuit), moteur d'échéances par circuit, écrans, CERFA par circuit, migration de
  reprise des fiches existantes. Chantier structurel — à ne lancer que si la pratique
  (A) ne suffit pas à l'atelier.

Questions à Franck avant tout code : comment déclare-t-il ses cascades aujourd'hui ?
Le QR collé sur l'équipement doit-il pointer l'ensemble ou le circuit ? Un contrôle
d'étanchéité d'atelier se fait-il par circuit ou par machine entière ?
