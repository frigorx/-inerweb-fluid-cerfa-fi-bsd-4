// inerWeb Fluide — © 2026 Franck Henninot — PolyForm Noncommercial (voir LICENSE) — inerweb.ovh
// ============================================================
// Déclaration annuelle réglementaire — 11 rubriques par fluide.
// MIROIR LITTÉRAL (CommonJS) de v8/js/data/declaration-annuelle.js :
// parité prouvée par test-declaration-annuelle. Ne jamais faire évoluer la
// LOGIQUE d'un côté sans l'autre. Voir l'en-tête du module ESM pour le
// contrat complet (entrées, sorties, pièges).
// ============================================================

/** États « fluide disponible » (achat certifié) — comptés en stock neuf. */
const ETATS_DISPONIBLE = ['VIERGE', 'RECYCLE', 'REGENERE'];

/** Arrondi au gramme, identique aux stores (Math.round(x·1000)/1000). */
function arrondir(x) {
  return Math.round((Number(x) || 0) * 1000) / 1000;
}

/**
 * Déclaration annuelle 11 rubriques par fluide.
 * @param {number} annee
 * @param {object} donnees - collections déjà lues (voir en-tête ESM)
 * @returns {{annee:number, lignes:object[], anomalies:object[], complet:boolean}}
 */
function calculerDeclarationAnnuelle(annee, donnees) {
  const an = Number(annee);
  const prefixe = `${an}-`;
  const d = donnees || {};
  const parFluide = new Map();

  const ligne = (fluide) => {
    if (!parFluide.has(fluide)) {
      parFluide.set(fluide, {
        fluide,
        acquisitionsKg: 0,            // 1
        chargesNeufKg: 0,             // 2
        chargesMaintenanceKg: 0,      // 3
        recupHorsUsageKg: 0,          // 4
        recupMaintenanceKg: 0,        // 5
        remisesDistributeurKg: 0,     // 6
        recyclagePropreKg: 0,         // 7 (toujours 0 : pas de recyclage interne)
        regenerationKg: 0,            // 8
        regenerationInstallations: [],
        destructionKg: 0,             // 9
        destructionInstallations: [],
        cessionsKg: 0,                // 10
        // 11 — stocks ventilés (remplis depuis les photos plus bas)
        stockDebutNeufKg: 0, stockDebutRecupKg: 0, stockDebutDechetKg: 0,
        stockFinNeufKg: 0, stockFinRecupKg: 0, stockFinDechetKg: 0,
        // informatif / anomalies
        recyclageFiliereKg: 0,        // BSFF issue RECYCLAGE (≠ rubrique 7)
        autreTraitementKg: 0,         // BSFF issue AUTRE
        remisNonAttesteKg: 0,         // remise sans issue attestée (anomalie)
        // Lot B2 — COMPTEUR D'ANOMALIE, JAMAIS UN POSTE DE MASSE : part des
        // masses ci-dessus dont le suivi ne porte AUCUNE pièce jointe. Elle
        // reste comptée dans sa rubrique (8, 9, recyclage, autre) — ce
        // champ ne fait que dire au lecteur où la pièce manque.
        remisIssueSansPieceKg: 0
      });
    }
    return parFluide.get(fluide);
  };

  // Rubrique 1 — acquisitions : bouteilles NEUVES entrées dans l'année.
  for (const b of d.bouteilles || []) {
    if (b.type !== 'NEUVE') continue;
    if (!String(b.dateEntree || '').startsWith(prefixe)) continue;
    const entree = Number.isFinite(b.masseEntreeKg)
      ? b.masseEntreeKg : b.masseNetteKg;
    const l = ligne(b.fluide);
    l.acquisitionsKg = arrondir(l.acquisitionsKg + (Number(entree) || 0));
  }

  // Rubriques 2-5 — charges / récupérations PAR TYPE (écritures figées de
  // l'année, statut VALIDE ou ANNULE : les contre-écritures conservent le
  // type et la quantité opposée → elles se neutralisent d'elles-mêmes).
  for (const mv of d.mouvements || []) {
    if (!String(mv.date || '').startsWith(prefixe)) continue;
    if (mv.statut !== 'VALIDE' && mv.statut !== 'ANNULE') continue;
    if (!Number.isFinite(mv.quantiteKg)) continue;
    const q = mv.quantiteKg;
    const l = ligne(mv.fluide);
    switch (mv.type) {
      case 'MISE_EN_SERVICE':
        l.chargesNeufKg = arrondir(l.chargesNeufKg + q); break;
      case 'CHARGE_APPOINT':
        l.chargesMaintenanceKg = arrondir(l.chargesMaintenanceKg + q); break;
      case 'RECUPERATION_DEMANTELEMENT':
        l.recupHorsUsageKg = arrondir(l.recupHorsUsageKg - q); break;
      case 'RECUPERATION_MAINTENANCE':
        l.recupMaintenanceKg = arrondir(l.recupMaintenanceKg - q); break;
      default: break; // TRANSFERT, CONTROLE_* : hors flux matière
    }
  }

  // Rubrique 6 — remises à un distributeur (retours fournisseur de l'année).
  for (const r of d.retoursFournisseur || []) {
    if (!String(r.date || '').startsWith(prefixe)) continue;
    const l = ligne(r.fluide);
    l.remisesDistributeurKg =
      arrondir(l.remisesDistributeurKg + (Number(r.masseKg) || 0));
  }

  // Rubriques 8/9 (+ informatif) — BSFF remis dans l'année, ventilés par
  // ISSUE de traitement final ATTESTÉE. Une remise SANS issue reste
  // « non attestée » : jamais comptée en destruction (défaut d'audit).
  // ⭐ Lot B2 (corrigé après revue) — LA PIÈCE MANQUANTE EST UNE ANOMALIE,
  // PAS UNE SOUSTRACTION. Une première version sortait des rubriques 8 et 9
  // toute issue déclarée sans pièce jointe : sur le jeu d'essai, 5,5 kg de
  // R-410A RÉELLEMENT détruits disparaissaient de la déclaration faite à
  // l'autorité. C'est une SOUS-DÉCLARATION, et une règle probatoire que la
  // réglementation n'écrit nulle part (elle n'a pas été soumise au
  // propriétaire du registre : interdit).
  // Doctrine maison : le doute retire l'ALLÈGEMENT, jamais l'OBLIGATION —
  // et il ne fait JAMAIS disparaître une masse d'une déclaration. La masse
  // reste donc EXACTEMENT dans sa rubrique ; l'absence totale de pièce
  // jointe au suivi est SIGNALÉE en anomalie (BSFF_ISSUE_SANS_PIECE), ce
  // qui dit au lecteur que la preuve reste à produire.
  const suivisAvecPiece = new Set(
    (d.piecesJointes || [])
      .filter((pj) => pj && String(pj.entiteType).toUpperCase() === 'BSFF')
      .map((pj) => pj.entiteId));
  for (const bsff of d.bsff || []) {
    if (!String(bsff.dateRemise || '').startsWith(prefixe)) continue;
    const l = ligne(bsff.fluide);
    const masse = Number(bsff.masseRemiseKg) || 0;
    const inst = bsff.installationTraitement || null;
    if (bsff.issueTraitement && !suivisAvecPiece.has(bsff.id)) {
      // Compteur d'anomalie uniquement : la masse suit son cours ci-dessous.
      l.remisIssueSansPieceKg = arrondir(l.remisIssueSansPieceKg + masse);
    }
    switch (bsff.issueTraitement) {
      case 'DESTRUCTION':
        l.destructionKg = arrondir(l.destructionKg + masse);
        if (inst && !l.destructionInstallations.includes(inst)) {
          l.destructionInstallations.push(inst);
        }
        break;
      case 'REGENERATION':
        l.regenerationKg = arrondir(l.regenerationKg + masse);
        if (inst && !l.regenerationInstallations.includes(inst)) {
          l.regenerationInstallations.push(inst);
        }
        break;
      case 'RECYCLAGE':
        l.recyclageFiliereKg = arrondir(l.recyclageFiliereKg + masse); break;
      case 'AUTRE':
        l.autreTraitementKg = arrondir(l.autreTraitementKg + masse); break;
      default:
        l.remisNonAttesteKg = arrondir(l.remisNonAttesteKg + masse); break;
    }
  }

  // Rubrique 10 — cessions à un tiers attesté (de l'année).
  for (const c of d.cessions || []) {
    if (!String(c.date || '').startsWith(prefixe)) continue;
    const l = ligne(c.fluide);
    l.cessionsKg = arrondir(l.cessionsKg + (Number(c.masseKg) || 0));
  }

  // Rubrique 11 — stocks au 1er janvier (photo N-1) et au 31 décembre
  // (photo N), ventilés : neuf-disponible / récupéré-en-attente / déchet.
  const ventiler = (photoAnnee, cles) => {
    for (const p of d.photosBouteilles || []) {
      if (Number(p.annee) !== photoAnnee) continue;
      const l = ligne(p.fluide);
      const masse = Number(p.masseNetteKg) || 0;
      const estDechet = p.etatFluide === 'DECHET' || p.statut === 'DECHET';
      if (estDechet) l[cles.dechet] = arrondir(l[cles.dechet] + masse);
      else if (ETATS_DISPONIBLE.includes(p.etatFluide)) {
        l[cles.neuf] = arrondir(l[cles.neuf] + masse);
      } else l[cles.recup] = arrondir(l[cles.recup] + masse);
    }
  };
  ventiler(an - 1, { neuf: 'stockDebutNeufKg', recup: 'stockDebutRecupKg',
    dechet: 'stockDebutDechetKg' });
  ventiler(an, { neuf: 'stockFinNeufKg', recup: 'stockFinRecupKg',
    dechet: 'stockFinDechetKg' });

  // « Photo présente » pour une année = il existe au moins une bouteille
  // photographiée cette année-là — la SEULE source que `ventiler` lit. Ne
  // jamais dériver ce fait d'une autre table (ex. `inventaires` legacy) :
  // une année inventoriée AVANT la photo nominative laisserait sinon les
  // stocks faussement à 0, sans repli ni anomalie (revue adversariale P0-8).
  const anneeAUnePhoto = (a) =>
    (d.photosBouteilles || []).some((p) => Number(p.annee) === a);
  const photoDebutPresente = anneeAUnePhoto(an - 1);
  const photoFinPresente = anneeAUnePhoto(an);

  // Repli du stock au 1er janvier sur « stocks initiaux » quand la photo
  // de clôture N-1 manque (moins probant — signalé en anomalie).
  if (!photoDebutPresente) {
    for (const si of d.stocksInitiaux || []) {
      if (Number(si.annee) !== an) continue;
      const l = ligne(si.fluide);
      l.stockDebutNeufKg = arrondir(Number(si.neufKg) || 0);
      l.stockDebutRecupKg = arrondir(Number(si.recupKg) || 0);
      // stocks_initiaux ne distingue pas le déchet : laissé à 0 (honnête).
    }
  }

  const lignes = [...parFluide.values()]
    .sort((a, b) => String(a.fluide).localeCompare(String(b.fluide)));

  // Anomalies — réconciliation / traçabilité manquante (l'écran ne ment pas).
  const anomalies = [];
  if (!photoDebutPresente) {
    anomalies.push({ code: 'PHOTO_DEBUT_ABSENTE',
      message: `Aucune photo d'inventaire au 31/12/${an - 1} : les stocks ` +
        `au 1er janvier sont repris de la saisie « stock initial » ` +
        `(moins probants).` });
  }
  if (!photoFinPresente) {
    anomalies.push({ code: 'PHOTO_FIN_ABSENTE',
      message: `Aucune photo d'inventaire au 31/12/${an} : les stocks de ` +
        `fin d'année ne sont pas établis.` });
  }
  for (const l of lignes) {
    // Lot B2 — l'anomalie dit EXACTEMENT ce qu'elle constate : aucune pièce
    // jointe au suivi. Elle ne prétend pas qu'une pièce prouverait l'issue
    // (n'importe quel fichier compte), et elle ne déplace aucun kilo.
    if (l.remisIssueSansPieceKg > 0) {
      anomalies.push({ code: 'BSFF_ISSUE_SANS_PIECE', fluide: l.fluide,
        masseKg: l.remisIssueSansPieceKg,
        message: `${l.fluide} : ${l.remisIssueSansPieceKg} kg remis en ` +
          `filière avec une issue de traitement déclarée, sur des suivis ` +
          `qui ne portent AUCUNE pièce jointe. La masse reste déclarée ` +
          `dans sa rubrique ; c'est la pièce à produire en cas de ` +
          `contrôle (certificat de l'installation, bordereau officiel) ` +
          `qui manque au dossier.` });
    }
    if (l.remisNonAttesteKg > 0) {
      anomalies.push({ code: 'BSFF_SANS_ISSUE', fluide: l.fluide,
        masseKg: l.remisNonAttesteKg,
        message: `${l.fluide} : ${l.remisNonAttesteKg} kg remis en filière ` +
          `déchet sans issue de traitement attestée (ni destruction, ni ` +
          `régénération, ni recyclage prouvés).` });
    }
  }

  return { annee: an, lignes, anomalies, complet: anomalies.length === 0 };
}

module.exports = { calculerDeclarationAnnuelle };
