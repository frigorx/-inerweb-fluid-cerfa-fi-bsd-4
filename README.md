# inerWeb Fluide

**Traçabilité des fluides frigorigènes et CERFA 15497\*04 pour les lycées professionnels — utilisable aussi par des professionnels.**

inerWeb Fluide permet de tenir un registre réglementaire complet des fluides frigorigènes (F-Gas) : traçable, justifiable, vérifiable et exportable, avec pièces justificatives et balance matière. Objectif : *« en un clic, je sors le dossier annuel complet de traçabilité fluides »*.

**➡️ [Essayer la démonstration en ligne](https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/)** — aucun compte, aucune installation, un clic.
**➡️ [Guide pas à pas](https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/guide.html)** — écran par écran, de l'installation au dossier d'audit.

La maquette validée (jetons de design, palette, captures d'écran) se trouve dans le dossier [`design/`](design/).

## Les deux modes d'utilisation

Un seul code, deux façons de l'utiliser. Le mode est déterminé au démarrage.

| | [Démo (GitHub Pages)](https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/v8/) | Local Lycée |
|---|---|---|
| **Public visé** | Découverte, bac à sable pédagogique | Établissement (recommandé) |
| **Installation** | Aucune (navigateur) | Dossier portable à copier, lancement par double-clic |
| **Données** | Fictives uniquement, stockées dans le navigateur | Base SQLite locale + documents à côté de l'application |
| **Comptes utilisateurs** | Non | Oui (ADMIN / RÉFÉRENT / ENSEIGNANT / ÉLÈVE) |
| **Mode Officiel** | Non — filigrane « DÉMO / FORMATION » permanent | **Codé, volontairement VERROUILLÉ** — voir ci-dessous |
| **Sauvegarde** | — | ZIP complet en un clic, restauration en un clic ; archive automatique vérifiée |
| **Réseau** | Site public statique | `localhost` par défaut ; réseau local possible, mais en HTTPS obligatoire |

> **Un mode « Cloud Lycée » figurait ici.** Il n'est pas implémenté : le
> programme ne parle à aucun service distant. La mention est retirée plutôt
> que maintenue au futur (P2-5, 23/07) — annoncer un hébergement engage
> l'établissement responsable de traitement au sens du RGPD.

### Où en est le mode Officiel

Il n'est pas « à venir » : **il est écrit, testé, et fermé à dessein.** Le
parcours complet existe (double signature réelle, PDF final conservé et haché,
écriture scellée en chaîne, contre-écriture, conditions de blocage
réglementaires). Un verrou de livraison unique (`VERROU_LIVRAISON`) le
maintient fermé le temps de solder les corrections issues de l'audit externe du
20/07/2026 ; sa réouverture est une décision, pas un développement.

En attendant, toute fiche produite porte le filigrane « DÉMO / FORMATION » :
le logiciel ne peut pas être pris pour un registre opposable par accident.

## Fonctionnalités clés

- **Registre verrouillé à contre-écritures** : une écriture validée n'est jamais modifiée ni effacée ; toute correction passe par une contre-écriture de régularisation, avec empreintes chaînées (SHA-256) rendant le registre **inaltérable au sein de l'application** (toute modification via l'application est refusée et toute rupture de la chaîne est détectable ; une manipulation directe du fichier de base par un tiers reste, elle, du ressort du chiffrement du disque).
- **Balance matière annuelle par fluide** : stock théorique calculé (achats, récupérations, charges, cessions, retours, destructions) comparé au stock réel pesé au 31/12 ; tout écart exige une justification.
- **CERFA officiel rempli (PDF)** : le formulaire 15497\*04 officiel est rempli automatiquement, avec un aperçu à l'écran fidèle au document ; la référence imprimée et archivée est toujours le PDF officiel.
- **Dossier audit annuel en un clic** : export ZIP complet (attestations, registres du personnel et de l'outillage, inventaires, mouvements, CERFA, contrôles d'étanchéité, BSFF, balance matière, journal d'audit) et vue « audit en 5 minutes ».
- **Modes Formation et Officiel strictement séparés** : numérotation distincte, filigrane massif sur tout document de formation, validation enseignant obligatoire ; un élève ne peut jamais produire un document d'apparence officielle.
- **Alertes réglementaires** : attestations expirées, étalonnages dépassés, contrôles d'étanchéité dus, délais de garde des fluides récupérés… Les alertes critiques bloquent le mode Officiel pour l'opération concernée. L'application intègre la transition réglementaire des arrêtés du 21 novembre 2025 (nouvelle grille de catégories d'aptitude obligatoire au 1ᵉʳ janvier 2027 ; les arrêtés de 2008 — 13 octobre pour l'aptitude des personnes, 30 juin pour la capacité des entreprises — sont abrogés au 31 décembre 2026).

## État du chantier

- **v8 : en construction.** La source de vérité du chantier est la spécification [`docs/SPEC-V8.md`](docs/SPEC-V8.md) (trois modes, modèle de données, règles réglementaires, sécurité).
- **v7 : fonctionnelle** et conservée en référence (version antérieure, gelée). Règle d'or du chantier : brancher le neuf avant de retirer l'ancien.

## Guides

- **[Guide interactif — prendre en main inerWeb Fluide](https://frigorx.github.io/-inerweb-fluid-cerfa-fi-bsd-4/guide.html)** (écran par écran, avec captures)
- [Installation simple (mode Local Lycée)](INSTALLATION_SIMPLE.md)
- [Sauvegarde et restauration](SAUVEGARDE.md)
- [Sécurité](SECURITE.md)
- [RGPD et données personnelles](RGPD.md)

## Licence et auteur

**Gratuit pour l'enseignement, payant pour le commerce.**

- **Lycées, CFA, universités, administrations, associations** : usage, copie, modification et
  diffusion **libres et gratuits**. La licence le dit explicitement : l'usage par une institution
  éducative est un usage permis, quelle que soit sa source de financement.
- **Usage commercial** (société de froid et climatisation, bureau d'études, organisme de formation
  privé à but lucratif, éditeur de logiciel…) : une licence distincte est nécessaire —
  écrire à **inerweb.fh@gmail.com**.

Licence : [PolyForm Noncommercial 1.0.0](LICENSE). Les bibliothèques embarquées (PDF.js, pdf-lib,
qrcodejs) restent sous **leur propre licence** : voir [LICENCES-TIERCES.md](LICENCES-TIERCES.md).

> Les versions publiées avant le 14/07/2026 l'ont été sous licence MIT. Cette licence-là reste
> valable pour ces versions : le changement vaut pour la suite.

**Franck Henninot** — Lycée professionnel Antoine Vidal, Nîmes.
Contact : inerweb.fh@gmail.com — <https://inerweb.ovh>
