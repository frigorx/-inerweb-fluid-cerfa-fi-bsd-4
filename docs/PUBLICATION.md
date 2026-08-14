# Publier un paquet — la procédure, en entier

> Un paquet = UN destinataire. Aucun paquet générique, aucun lien public :
> c'est le dispositif de licence nominative (docs/PLAN-LICENCE-NOMINATIVE.md).

## Prérequis (une fois)

- La clé privée de signature existe chez le propriétaire (hors dépôt) et sa
  sauvegarde HORS LIGNE est faite. Elle ne croise JAMAIS un outil d'analyse.
- Le runtime à embarquer est le Node VALIDÉ (voir `outils/fabriquer-paquet.mjs`,
  constante `NODE_VALIDE`), téléchargé de nodejs.org et vérifié contre le
  `SHASUMS256.txt` officiel.

## À chaque demande

1. **Vérifier l'état** : le filet doit être TOUT VERT (`npm test`) et le
   dépôt propre, poussé, contrôle continu vert.
2. **Délivrer la licence** :
   `node outils/delivrer-licence.mjs "Prénom Nom" courriel@exemple.fr [--mois 6]`
   L'outil numérote, signe, consigne au registre des livraisons, et imprime
   le modèle de courriel avec la demande d'ACCEPTATION EXPLICITE.
3. **Fabriquer le paquet** avec le Node validé (la commande exacte est
   imprimée par l'outil de délivrance) : la licence est vérifiée AVANT
   l'assemblage, le zip porte le numéro, l'empreinte SHA-256 est reportée
   au registre.
4. **Envoyer** : le zip par le canal convenu (partage restreint au seul
   destinataire, jamais « quiconque a le lien ») ; l'empreinte SHA-256 dans
   le corps du courriel. Idéalement, transmettre l'empreinte par un second
   canal.
5. **Archiver la réponse d'acceptation** (elle vaut acceptation datée du
   contrat) AVANT de donner l'accès au téléchargement.

## Règles permanentes

- Délivrance UNE PAR UNE (le registre est un CSV, pas une base
  transactionnelle).
- Une copie qui circule s'attribue par son empreinte au registre : elle
  désigne le PAQUET livré, pas une personne au sens probatoire.
- Toute nouvelle version du runtime Node embarqué = mise à jour de
  `NODE_VALIDE` + `NODE-LICENSE.txt` + refabrication + re-preuve.
