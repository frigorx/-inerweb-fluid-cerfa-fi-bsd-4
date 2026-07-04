// ============================================================
// inerWeb Fluide — Harnais du cas test « local » (V9-E3)
//
// Amorce un LocalStore branché sur une BASE JETABLE (mkdtemp), via un
// transport IN-PROCESS qui appelle directement server/api.js — mais en
// SÉRIALISANT/DÉSÉRIALISANT le JSON à l'aller comme au retour, pour
// éprouver le contrat de transport (copies fraîches, pas de référence
// vive partagée) exactement comme le ferait le vrai transport HTTP.
//
// Le contexte de session est { role:'REFERENT' } : la barrière de rôle
// de la route laisse passer les validations (la garde métier, elle,
// refuse un validateur ELEVE désigné — cf. E3-PLAN §Rôles).
//
// Le store est rendu DÉJÀ INITIALISÉ (init() a tourné, registreAltere
// posé), prêt pour test-contrat.mjs.
// ============================================================

import { createRequire } from 'node:module';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const db = require('./db.js');
const api = require('./api.js');

import { creerLocalStore } from '../v8/js/data/local-store.js';

/**
 * Construit un LocalStore de test sur une base SQLite jetable.
 * @returns {Promise<object>} store initialisé, conforme au contrat.
 */
export async function creerStoreDeTest() {
  // Base jetable propre à cette exécution (jamais le data/ réel).
  const dossier = mkdtempSync(join(tmpdir(), 'inerweb-fluide-contrat-'));
  const chemin = join(dossier, 'test.db');
  db.ouvrir(chemin); // crée le socle v1 (schema.sql + migrations)

  // Contexte de session du harnais : un référent (VALIDEUR).
  const contexte = { role: 'REFERENT' };

  // Transport in-process : même signature que le transport HTTP, même
  // enveloppe { ok, resultat } / { ok:false, erreur, code }. On force la
  // sérialisation JSON aux deux extrémités (copies, éprouve le contrat).
  const transport = async (methode, params) => {
    const paramsSerialises = JSON.parse(JSON.stringify(params ?? {}));
    let enveloppe;
    try {
      const resultat = api.appeler(methode, paramsSerialises, contexte);
      // Sérialisation du retour : le front ne reçoit qu'une copie fraîche.
      enveloppe = JSON.parse(JSON.stringify({ ok: true, resultat }));
    } catch (erreur) {
      enveloppe = { ok: false, erreur: erreur.message, code: erreur.code ?? 400 };
    }
    if (enveloppe.ok === true) return enveloppe.resultat;
    throw new Error(enveloppe.erreur);
  };

  const store = creerLocalStore(transport);
  await store.init();
  return store;
}
