// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// Déclaration annuelle 11 rubriques (P0-8, DA-4) : sémantique + parité STRICTE
// v8/js/data/declaration-annuelle.js (ESM) ↔ server/declaration-annuelle.js
// (miroir littéral CommonJS). Comparaison par JSON.stringify. Non doublé.

import { createRequire } from 'node:module';
import { calculerDeclarationAnnuelle }
  from '../v8/js/data/declaration-annuelle.js';

const require = createRequire(import.meta.url);
const miroir = require('./declaration-annuelle.js');

let nbOk = 0;
let nbEchecs = 0;
function verifier(libelle, condition, detail = '') {
  if (condition) { nbOk += 1; console.log(`  OK  ${libelle}`); }
  else { nbEchecs += 1; console.error(`ÉCHEC ${libelle}${detail ? ` — ${detail}` : ''}`); }
}
const P = (a, b) => Math.abs(a - b) < 1e-6;

// ============================================================
// Scénario complet — année 2026, deux fluides, chaque rubrique sollicitée
// ============================================================
const DONNEES = {
  mouvements: [
    { type: 'MISE_EN_SERVICE', fluide: 'R-410A', quantiteKg: 5, statut: 'VALIDE', date: '2026-03-10' },
    { type: 'CHARGE_APPOINT', fluide: 'R-410A', quantiteKg: 2, statut: 'VALIDE', date: '2026-04-01' },
    // Écriture annulée : original ANNULE +1 et contre-écriture VALIDE −1 → net 0
    { type: 'CHARGE_APPOINT', fluide: 'R-410A', quantiteKg: 1, statut: 'ANNULE', date: '2026-04-02' },
    { type: 'CHARGE_APPOINT', fluide: 'R-410A', quantiteKg: -1, statut: 'VALIDE', date: '2026-04-02' },
    { type: 'RECUPERATION_MAINTENANCE', fluide: 'R-410A', quantiteKg: -3, statut: 'VALIDE', date: '2026-05-01' },
    { type: 'RECUPERATION_DEMANTELEMENT', fluide: 'R-32', quantiteKg: -4, statut: 'VALIDE', date: '2026-06-01' },
    { type: 'TRANSFERT', fluide: 'R-410A', quantiteKg: 10, statut: 'VALIDE', date: '2026-06-02' },
    { type: 'CONTROLE_PERIODIQUE', fluide: 'R-410A', quantiteKg: 0, statut: 'VALIDE', date: '2026-06-03' },
    // Mauvaise année : ignorée
    { type: 'MISE_EN_SERVICE', fluide: 'R-410A', quantiteKg: 99, statut: 'VALIDE', date: '2025-12-31' }
  ],
  bouteilles: [
    { type: 'NEUVE', fluide: 'R-410A', masseEntreeKg: 12, masseNetteKg: 12, dateEntree: '2026-03-05' },
    { type: 'NEUVE', fluide: 'R-32', masseEntreeKg: 8, masseNetteKg: 8, dateEntree: '2025-11-01' },
    { type: 'RECUPERATION', fluide: 'R-410A', masseEntreeKg: 0, masseNetteKg: 3, dateEntree: '2026-05-01' }
  ],
  retoursFournisseur: [
    { fluide: 'R-410A', masseKg: 6, date: '2026-07-01' }
  ],
  // Lot B2 : chaque suivi porte un id, et l'issue ne compte que si une
  // PIÈCE JUSTIFICATIVE est jointe (piecesJointes plus bas).
  bsff: [
    { id: 'SF-1', fluide: 'R-410A', masseRemiseKg: 3, dateRemise: '2026-08-01', issueTraitement: 'DESTRUCTION', installationTraitement: 'Incinérateur agréé de Fos' },
    { id: 'SF-2', fluide: 'R-410A', masseRemiseKg: 2, dateRemise: '2026-08-02', issueTraitement: 'REGENERATION', installationTraitement: 'Régé-Fluides Lyon' },
    { id: 'SF-3', fluide: 'R-410A', masseRemiseKg: 0.5, dateRemise: '2026-08-03', issueTraitement: 'AUTRE', installationTraitement: null },
    { id: 'SF-4', fluide: 'R-32', masseRemiseKg: 1, dateRemise: '2026-08-04', issueTraitement: 'RECYCLAGE', installationTraitement: null },
    { id: 'SF-5', fluide: 'R-32', masseRemiseKg: 1.5, dateRemise: '2026-08-05', issueTraitement: null, installationTraitement: null }
  ],
  piecesJointes: [
    { entiteType: 'BSFF', entiteId: 'SF-1' },
    { entiteType: 'BSFF', entiteId: 'SF-2' },
    { entiteType: 'BSFF', entiteId: 'SF-3' },
    { entiteType: 'BSFF', entiteId: 'SF-4' },
    // SF-5 n'a pas d'issue : la pièce n'y changerait rien.
    { entiteType: 'MOUVEMENT', entiteId: 'MVT-1' }
  ],
  cessions: [
    { fluide: 'R-410A', masseKg: 4, date: '2026-09-01' },
    { fluide: 'R-32', masseKg: 2, date: '2026-09-02' }
  ],
  stocksInitiaux: [
    { annee: 2026, fluide: 'R-410A', neufKg: 20, recupKg: 5 }
  ],
  photosBouteilles: [
    // Photo N-1 (clôture 2025) = stock au 1er janvier 2026
    { annee: 2025, fluide: 'R-410A', etatFluide: 'VIERGE', statut: 'EN_STOCK', masseNetteKg: 20 },
    { annee: 2025, fluide: 'R-410A', etatFluide: 'DECHET', statut: 'DECHET', masseNetteKg: 1 },
    { annee: 2025, fluide: 'R-32', etatFluide: 'RECUPERE', statut: 'EN_STOCK', masseNetteKg: 3 },
    // Photo N (clôture 2026) = stock au 31 décembre 2026
    { annee: 2026, fluide: 'R-410A', etatFluide: 'VIERGE', statut: 'EN_STOCK', masseNetteKg: 15 },
    { annee: 2026, fluide: 'R-32', etatFluide: 'RECUPERE', statut: 'DECHET', masseNetteKg: 2 }
  ]
};

const decl = calculerDeclarationAnnuelle(2026, DONNEES);
const l410 = decl.lignes.find((x) => x.fluide === 'R-410A');
const l32 = decl.lignes.find((x) => x.fluide === 'R-32');

verifier('année et tri des lignes', decl.annee === 2026
  && decl.lignes.length === 2 && decl.lignes[0].fluide === 'R-32');

// R-410A — chaque rubrique
verifier('R1 acquisitions = 12 (bouteille NEUVE 2026)', P(l410.acquisitionsKg, 12));
verifier('R2 charges en neuf = 5 (MISE_EN_SERVICE)', P(l410.chargesNeufKg, 5));
verifier('R3 charges maintenance = 2 (CHARGE_APPOINT, contre-écriture neutralisée)',
  P(l410.chargesMaintenanceKg, 2));
verifier('R4 récup hors d’usage = 0', P(l410.recupHorsUsageKg, 0));
verifier('R5 récup maintenance = 3', P(l410.recupMaintenanceKg, 3));
verifier('R6 remises distributeur = 6', P(l410.remisesDistributeurKg, 6));
verifier('R7 recyclage propre = 0 (jamais alimenté)', P(l410.recyclagePropreKg, 0));
verifier('R8 régénération = 2 + installation', P(l410.regenerationKg, 2)
  && l410.regenerationInstallations.length === 1
  && l410.regenerationInstallations[0] === 'Régé-Fluides Lyon');
verifier('R9 destruction = 3 (issue DESTRUCTION SEULE) + installation',
  P(l410.destructionKg, 3) && l410.destructionInstallations[0] === 'Incinérateur agréé de Fos');
verifier('R10 cessions = 4', P(l410.cessionsKg, 4));
verifier('BSFF AUTRE en informatif (0,5), pas en destruction', P(l410.autreTraitementKg, 0.5)
  && P(l410.remisNonAtteste ?? l410.remisNonAttesteKg, 0));
verifier('R11 stock début (photo 2025) : neuf 20 · déchet 1',
  P(l410.stockDebutNeufKg, 20) && P(l410.stockDebutDechetKg, 1)
  && P(l410.stockDebutRecupKg, 0));
verifier('R11 stock fin (photo 2026) : neuf 15', P(l410.stockFinNeufKg, 15)
  && P(l410.stockFinDechetKg, 0));

// R-32 — BSFF ≠ destruction, recyclage en filière, remise non attestée
verifier('R-32 R4 récup hors d’usage = 4', P(l32.recupHorsUsageKg, 4));
verifier('R-32 destruction = 0 (aucune issue DESTRUCTION)', P(l32.destructionKg, 0));
verifier('R-32 recyclage en filière = 1 (issue RECYCLAGE, informatif)',
  P(l32.recyclageFiliereKg, 1));
verifier('R-32 remis NON attesté = 1,5 (issue absente — jamais en destruction)',
  P(l32.remisNonAttesteKg, 1.5));
verifier('R-32 cessions = 2', P(l32.cessionsKg, 2));
verifier('R-32 stock début récup 3 · fin déchet 2 (statut DECHET)',
  P(l32.stockDebutRecupKg, 3) && P(l32.stockFinDechetKg, 2));

// Anomalies : une seule (BSFF sans issue), photos présentes → pas d'anomalie photo
verifier('anomalie BSFF_SANS_ISSUE présente pour R-32',
  decl.anomalies.some((a) => a.code === 'BSFF_SANS_ISSUE' && a.fluide === 'R-32'));
verifier('aucune anomalie de photo (les deux photos existent)',
  !decl.anomalies.some((a) => a.code.startsWith('PHOTO_')));
verifier('déclaration NON complète (une anomalie subsiste)', decl.complet === false);

// ============================================================
// Scénario sans photo : repli stocks initiaux + anomalies de photo
// ============================================================
{
  const sansPhoto = calculerDeclarationAnnuelle(2026, {
    ...DONNEES, photosBouteilles: []
  });
  const r410 = sansPhoto.lignes.find((x) => x.fluide === 'R-410A');
  verifier('sans photo N-1 : stock début repris de stocks_initiaux (neuf 20, récup 5)',
    P(r410.stockDebutNeufKg, 20) && P(r410.stockDebutRecupKg, 5));
  verifier('sans photo : stock fin à 0 (non établi)',
    P(r410.stockFinNeufKg, 0) && P(r410.stockFinDechetKg, 0));
  verifier('sans photo : 2 anomalies de photo (début + fin)',
    sansPhoto.anomalies.filter((a) => a.code.startsWith('PHOTO_')).length === 2);
}

// ============================================================
// Régression (revue adversariale P0-8, constat BLOQUANT) : une année
// INVENTORIÉE mais SANS photo nominative (base antérieure à la photo B7)
// ne doit jamais laisser les stocks faussement à 0 sans repli ni anomalie.
// La présence d'une photo se déduit de photosBouteilles SEUL.
// ============================================================
{
  const photoFinSeule = calculerDeclarationAnnuelle(2026, {
    ...DONNEES,
    // Photo 2026 SEULE : rien pour 2025 (inventaire legacy sans photo).
    photosBouteilles: DONNEES.photosBouteilles.filter((p) => p.annee === 2026)
  });
  const r410 = photoFinSeule.lignes.find((x) => x.fluide === 'R-410A');
  verifier('photo N-1 absente : stock début REPLIÉ sur stocks_initiaux (20 · 5), jamais 0',
    P(r410.stockDebutNeufKg, 20) && P(r410.stockDebutRecupKg, 5));
  verifier('photo N-1 absente : anomalie PHOTO_DEBUT_ABSENTE levée, complet=false',
    photoFinSeule.anomalies.some((a) => a.code === 'PHOTO_DEBUT_ABSENTE')
    && photoFinSeule.complet === false);
  verifier('photo N présente : le stock de fin reste établi depuis la photo 2026',
    P(r410.stockFinNeufKg, 15));
  verifier('parité ESM ↔ serveur (photo N-1 absente)',
    JSON.stringify(photoFinSeule) === JSON.stringify(
      miroir.calculerDeclarationAnnuelle(2026, {
        ...DONNEES,
        photosBouteilles: DONNEES.photosBouteilles.filter((p) => p.annee === 2026)
      })));
}

// ============================================================
// Réconciliation : charges/récup ventilées = totaux « bloc » attendus
// ============================================================
verifier('réconciliation charges : neuf + maintenance = 7 (= total charges R-410A)',
  P(l410.chargesNeufKg + l410.chargesMaintenanceKg, 7));
verifier('réconciliation BSFF : la somme des issues = masse totale remise R-410A (5,5)',
  P(l410.destructionKg + l410.regenerationKg + l410.recyclageFiliereKg
    + l410.autreTraitementKg + l410.remisNonAttesteKg
    + l410.remisIssueSansPreuveKg, 5.5));

// ============================================================
// Lot B2 — L'ISSUE S'APPUIE SUR UNE PIÈCE : le MÊME jeu, privé de ses
// pièces justificatives. Aucun kilo ne s'évapore : il change de poste.
// ============================================================
{
  const sansPieces = { ...DONNEES, piecesJointes: [] };
  const decl2 = calculerDeclarationAnnuelle(2026, sansPieces);
  const a410 = decl2.lignes.find((l) => l.fluide === 'R-410A');
  const a32 = decl2.lignes.find((l) => l.fluide === 'R-32');
  verifier('sans pièce : rubrique 9 (destruction) vidée',
    P(a410.destructionKg, 0) && a410.destructionInstallations.length === 0);
  verifier('sans pièce : rubrique 8 (régénération) vidée',
    P(a410.regenerationKg, 0));
  verifier('sans pièce : les masses partent en « déclaré sans preuve » (5,5)',
    P(a410.remisIssueSansPreuveKg, 5.5));
  verifier('sans pièce : aucun kilo perdu pour R-32 (1 sans preuve + 1,5 non attesté)',
    P(a32.remisIssueSansPreuveKg, 1) && P(a32.remisNonAttesteKg, 1.5));
  verifier('sans pièce : anomalie BSFF_ISSUE_SANS_PIECE sur les deux fluides',
    decl2.anomalies.filter((a) => a.code === 'BSFF_ISSUE_SANS_PIECE').length === 2
    && decl2.complet === false);
  verifier('sans pièce : anomalie BSFF_SANS_ISSUE toujours distincte',
    decl2.anomalies.some((a) => a.code === 'BSFF_SANS_ISSUE'));
  verifier('parité ESM ↔ serveur (sans pièces justificatives)',
    JSON.stringify(decl2)
    === JSON.stringify(miroir.calculerDeclarationAnnuelle(2026, sansPieces)));
}

// ============================================================
// Parité STRICTE ESM ↔ CommonJS sur les deux scénarios
// ============================================================
verifier('parité ESM ↔ serveur (scénario complet)',
  JSON.stringify(decl)
  === JSON.stringify(miroir.calculerDeclarationAnnuelle(2026, DONNEES)));
verifier('parité ESM ↔ serveur (année vide)',
  JSON.stringify(calculerDeclarationAnnuelle(2030, DONNEES))
  === JSON.stringify(miroir.calculerDeclarationAnnuelle(2030, DONNEES)));

console.log(`\n${nbOk} vérifications réussies, ${nbEchecs} échec(s).`);
if (nbEchecs > 0) process.exit(1);
console.log('Déclaration annuelle : sémantique et parité, tout est vert.');
