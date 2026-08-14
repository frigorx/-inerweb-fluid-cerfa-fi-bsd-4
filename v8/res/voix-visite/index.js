/* Index du lot audio de la visite guidée — destiné à être RÉGÉNÉRÉ par
   `node outils/generer-voix-visite.mjs` (Piper + ffmpeg sur le poste) :
   ne pas modifier à la main. Tant que `entrees` est vide, la visite parle
   avec la voix du navigateur (repli prévu — elle ne dépend jamais du lot). */
export const INDEX_VOIX_VISITE = {
  version: '1',
  voix: 'fr_FR-siwis-medium',
  moteur: 'Piper / VITS',
  frequenceHz: 22050,
  debitKbps: 48,
  entrees: {}
};
