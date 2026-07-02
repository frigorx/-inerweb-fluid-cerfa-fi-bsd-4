# inerWeb Fluide

**Traçabilité des fluides frigorigènes et CERFA 15497\*04 pour les lycées professionnels — utilisable aussi par des professionnels.**

inerWeb Fluide permet de tenir un registre réglementaire complet des fluides frigorigènes (F-Gas) : traçable, justifiable, vérifiable et exportable, avec pièces justificatives et balance matière. Objectif : *« en un clic, je sors le dossier annuel complet de traçabilité fluides »*.

La maquette validée (jetons de design, palette, captures d'écran) se trouve dans le dossier [`design/`](design/).

## Les trois modes d'utilisation

Un seul code, trois façons de l'utiliser. Le mode est déterminé au démarrage.

| | Démo (GitHub Pages) | Local Lycée | Cloud Lycée |
|---|---|---|---|
| **Public visé** | Découverte, bac à sable pédagogique | Établissement (recommandé) | Établissement multi-postes |
| **Installation** | Aucune (navigateur) | Dossier portable à copier, lancement par double-clic | Projet Supabase (hébergement UE) |
| **Données** | Fictives uniquement, stockées dans le navigateur | Base SQLite locale + documents à côté de l'application | PostgreSQL + stockage de documents privé |
| **Comptes utilisateurs** | Non | Oui (ADMIN / RÉFÉRENT / ENSEIGNANT / ÉLÈVE) | Oui (authentification Supabase) |
| **Mode Officiel** | Non — filigrane « DÉMO / FORMATION » permanent | Oui | Oui |
| **Sauvegarde** | — | ZIP complet en un clic, restauration en un clic | Automatique planifiée + export local à tout moment |
| **Réseau** | Site public statique | `localhost` uniquement, aucune donnée ne sort du poste | Multi-utilisateurs simultanés |

## Fonctionnalités clés

- **Registre verrouillé à contre-écritures** : une écriture validée n'est jamais modifiée ni effacée ; toute correction passe par une contre-écriture de régularisation, avec empreintes chaînées (SHA-256) rendant le registre inviolable.
- **Balance matière annuelle par fluide** : stock théorique calculé (achats, récupérations, charges, cessions, retours, destructions) comparé au stock réel pesé au 31/12 ; tout écart exige une justification.
- **CERFA officiel rempli (PDF)** : le formulaire 15497\*04 officiel est rempli automatiquement, avec un aperçu à l'écran fidèle au document ; la référence imprimée et archivée est toujours le PDF officiel.
- **Dossier audit annuel en un clic** : export ZIP complet (attestations, registres du personnel et de l'outillage, inventaires, mouvements, CERFA, contrôles d'étanchéité, BSFF, balance matière, journal d'audit) et vue « audit en 5 minutes ».
- **Modes Formation et Officiel strictement séparés** : numérotation distincte, filigrane massif sur tout document de formation, validation enseignant obligatoire ; un élève ne peut jamais produire un document d'apparence officielle.
- **Alertes réglementaires** : attestations expirées, étalonnages dépassés, contrôles d'étanchéité dus, délais de garde des fluides récupérés… Les alertes critiques bloquent le mode Officiel pour l'opération concernée. L'application intègre la transition réglementaire de l'arrêté du 21 novembre 2025 (nouvelle grille de catégories obligatoire au 1ᵉʳ janvier 2027, arrêté du 30 juin 2008 abrogé au 31 décembre 2026).

## État du chantier

- **v8 : en construction.** La source de vérité du chantier est la spécification [`docs/SPEC-V8.md`](docs/SPEC-V8.md) (trois modes, modèle de données, règles réglementaires, sécurité).
- **v7 : fonctionnelle** et conservée en référence (version antérieure, gelée). Règle d'or du chantier : brancher le neuf avant de retirer l'ancien.

## Guides

- [Installation simple (mode Local Lycée)](INSTALLATION_SIMPLE.md)
- [Installation Cloud (mode Cloud Lycée)](INSTALLATION_CLOUD.md)
- [Sauvegarde et restauration](SAUVEGARDE.md)
- [Sécurité](SECURITE.md)
- [RGPD et données personnelles](RGPD.md)

## Licence et auteur

Projet pédagogique diffusé gratuitement aux lycées professionnels froid et climatisation, sous [licence MIT](LICENSE).

Frédéric Henninot — Lycée professionnel Jacques Raynaud, Marseille.
