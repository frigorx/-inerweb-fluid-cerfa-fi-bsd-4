/* =====================================================================
   LIVRET « HABILITATION FLUIDE » — CHAPITRE GÉNÉRÉ : LES CATÉGORIES
   ---------------------------------------------------------------------
   Le chapitre 4 (« Les sept catégories, et la bascule de 2027 ») n'a pas
   de fiche source : ses valeurs sortent TOUTES du référentiel
   (`packs/fluides/referentiel-2025.json`, transcription de l'arrêté du
   21 novembre 2025). Ce module n'écrit que la colle entre les valeurs :
   aucun chiffre, aucune date, aucun périmètre n'est saisi ici.

   Il rend des leçons de la même forme que celles de l'extracteur
   (paras HTML + blocs), plus un champ `tableau` que le maillon DOCX
   saura mettre en page.
   ===================================================================== */

/* 255 minutes → « 4 h 15 » ; 60 → « 1 h » ; 90 → « 1 h 30 ». */
const duree = (min) => {
  if (min == null) return '—';
  const h = Math.floor(min / 60); const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
};

/* « 2027-01-01 » → « 1er janvier 2027 » — sans passer par Date (fuseaux). */
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
  'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dateFr = (iso) => {
  const [a, m, j] = iso.split('-').map(Number);
  return `${j === 1 ? '1er' : j} ${MOIS[m - 1]} ${a}`;
};

const chargeDe = (c) => {
  if (!c.limite_charge) return 'aucune';
  const l = c.limite_charge;
  return `moins de ${l.standard_kg} kg (${l.hermetique_scelle_etiquete_kg} kg si hermétiquement scellé et étiqueté)`;
};

export const leconsCategories = (ref) => {
  const src = ref.source;
  const cats = ref.categories;
  const compo = ref.regles_composition;
  const dur = ref.durees_epreuves;
  const ponct = ref.remise_a_niveau_ponctuelle;
  const period = ref.remise_a_niveau_periodique;

  return [
    /* ------------------- Leçon 1 : le tableau des sept ------------------- */
    {
      t: 'Sept catégories, un seul texte',
      src: 'referentiel-2025.json',
      titre_source: src.texte,
      paras: [
        `Tout part d'un seul texte : l'<b>${src.texte.split(' relatif')[0]}</b>, ` +
        `publié au ${src.publication.replace(/, texte.*$/, '')}. Il applique en France le ` +
        `<b>règlement (UE) 2024/573</b> sur les gaz à effet de serre fluorés. ` +
        `Ce texte définit <b>sept catégories</b> d'attestation d'aptitude : chacune dit ce que son titulaire ` +
        `a le droit de faire, et sur quels fluides.`,
        `L'attestation est <b>personnelle</b>. Elle ne dit pas ce que vous savez faire : elle dit ce que ` +
        `vous avez <b>le droit</b> de faire. Lisez chaque ligne du tableau en cherchant votre cas.`,
      ],
      tableau: {
        titre: 'Les sept catégories de l’arrêté',
        entetes: ['Catégorie', 'Ce qu’elle autorise', 'Limite de charge', 'Ancienne catégorie (2008)'],
        lignes: cats.map((c) => [
          c.id,
          c.perimetre,
          chargeDe(c),
          c.correspondance_2008 || '(nouvelle)',
        ]),
      },
      blocs: [],
      question: null,
    },

    /* ------------------- Leçon 2 : l'épreuve ------------------- */
    {
      t: 'Ce que dure l’épreuve, et ce qu’elle tire au sort',
      src: 'referentiel-2025.json',
      titre_source: src.annexe,
      paras: [
        `Pour les catégories A1, A2, B et C, l'épreuve commence par un <b>tronc commun</b> : ` +
        `${duree(dur.tronc_commun_A1_A2_B_C.theorique)} de théorie et ` +
        `${duree(dur.tronc_commun_A1_A2_B_C.pratique)} de pratique, puis une partie spécifique à la catégorie. ` +
        `Les catégories D et E ont leur épreuve propre, plus courte.`,
        `L'épreuve porte toujours sur les groupes ${compo.groupes_obligatoires.map((g) => g.replace('G', '')).join(', ')} — ` +
        `et sur <b>au moins un</b> des groupes ${compo.groupes_tirage_au_sort.parmi.map((g) => g.replace('G', '')).join(', ')}, ` +
        `<b>tiré au sort le jour de l'épreuve</b>. ${compo.groupes_tirage_au_sort.libelle_source.split('.')[1]?.trim() || ''}. ` +
        `Conséquence simple : les quatre groupes d'organes s'apprennent tous.`,
      ],
      tableau: {
        titre: 'Les durées d’épreuve (réglementaires)',
        entetes: ['Catégorie', 'Théorie', 'Pratique', 'Total'],
        lignes: [
          ...['A1', 'A2', 'B', 'C'].map((id) => [
            id,
            `${duree(dur.tronc_commun_A1_A2_B_C.theorique)} + ${duree(dur[id].theorique_specifique)}`,
            `${duree(dur.tronc_commun_A1_A2_B_C.pratique)} + ${duree(dur[id].pratique_specifique)}`,
            duree(dur[id].total),
          ]),
          ...['D', 'E'].map((id) => [
            id, duree(dur[id].theorique), duree(dur[id].pratique), duree(dur[id].total),
          ]),
        ],
      },
      blocs: [
        {
          type: 'cle',
          t: 'Un aménagement existe, demandez-le',
          html: `<p>En cas de handicap ou de trouble de l'apprentissage reconnu (RQTH, MDPH, aménagement ` +
            `déjà accordé par l'Éducation nationale, ou certificat de moins de six mois), la durée de ` +
            `l'examen peut être majorée jusqu'à <b>${ponctOuTiers(ref)}</b>. La demande se prépare ` +
            `<b>avant</b> l'inscription, avec le justificatif.</p>`,
        },
      ],
      question: null,
    },

    /* ------------------- Leçon 3 : la bascule ------------------- */
    {
      t: 'La bascule de 2027 — et la date de ' + ponct.echeance.slice(0, 4),
      src: 'referentiel-2025.json',
      titre_source: src.texte,
      paras: [
        `L'ancien système (arrêté de 2008, catégories I à V) s'éteint : il est abrogé au ` +
        `<b>${dateFr(src.abrogation_arrete_2008)}</b>, et le nouveau référentiel devient <b>obligatoire le ` +
        `${dateFr(src.obligatoire_le)}</b>. ${src.regime_transitoire}`,
        `Si vous détenez déjà une attestation des anciennes catégories I à IV, elle a une <b>date butoir</b> : ` +
        `le <b>${dateFr(ponct.echeance)}</b>. Avant cette date, une <b>remise à niveau ponctuelle</b> chez un ` +
        `organisme formateur certifié vous fait passer dans la catégorie correspondante du tableau de la ` +
        `première leçon. Après cette date : ${ponct.sanction_defaut.charAt(0).toLowerCase()}${ponct.sanction_defaut.slice(1)}`,
        `Le nouveau régime n'est pas acquis pour toujours : une <b>remise à niveau périodique</b> est due ` +
        `<b>${period.periodicite.replace('a minima ', '')}</b>. À défaut : ` +
        `${period.sanction_defaut.charAt(0).toLowerCase()}${period.sanction_defaut.slice(1).split(';')[0].trim()}.`,
      ],
      blocs: [],
      question: null,
    },
  ];
};

/* La majoration handicap, telle que l'arrêté la formule. */
const ponctOuTiers = (ref) =>
  ref.durees_epreuves.amenagement_handicap.majoration_maximale;
