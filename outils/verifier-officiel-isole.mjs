// Essai du parcours Officiel sur une copie de sources et des bases jetables.
// Ne lance aucun serveur, ne lit ni .env ni base de production.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const racine = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const liste = spawnSync('git', ['ls-files', '-z', '--', 'server', 'v8', 'package.json', 'LICENSE'],
  { cwd: racine, encoding: 'utf8' });
if (liste.status !== 0) throw new Error('Inventaire Git indisponible : essai interrompu.');
const destination = mkdtempSync(join(tmpdir(), 'inerweb-officiel-isole-'));
const verrouPaths = ['server/blocage-officiel.js', 'v8/js/data/blocage-officiel.js'];
const hash = fichier => createHash('sha256').update(readFileSync(fichier)).digest('hex');
const avant = verrouPaths.map(p => hash(join(racine, p)));
for (const fichier of liste.stdout.split('\0').filter(Boolean)) {
  const cible = resolve(destination, fichier);
  const rel = relative(destination, cible);
  if (rel.startsWith('..') || rel.includes(':')) throw new Error('Chemin hors copie refusé.');
  // Les sources suivies seulement : aucun dossier de données opérationnelles.
  if (!/^(server\/|v8\/|package\.json$|LICENSE$)/.test(fichier)) continue;
  mkdirSync(dirname(cible), { recursive: true });
  copyFileSync(join(racine, fichier), cible);
}
for (const fichier of verrouPaths) {
  const cible = join(destination, fichier);
  const texte = readFileSync(cible, 'utf8');
  if (!texte.includes('const VERROU_LIVRAISON = true;')) {
    throw new Error('Le verrou principal doit être actif pour ce harnais isolé.');
  }
  writeFileSync(cible, texte.replace('const VERROU_LIVRAISON = true;', 'const VERROU_LIVRAISON = false;'));
}
console.log(`Copie de test : ${destination}`);
const resultat = spawnSync(process.execPath, ['server/test-officiel-e2e.mjs'], {
  cwd: destination, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120000
});
const sortie = `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`;
writeFileSync(join(destination, 'RESULTAT-ESSAI.txt'), sortie);
console.log(resultat.stdout ?? '');
if (resultat.status !== 0) console.error(resultat.stderr || resultat.error);
if (verrouPaths.some((p, i) => hash(join(racine, p)) !== avant[i])) {
  throw new Error('Les fichiers de verrou du dépôt ont changé pendant cet essai.');
}
console.log('Verrous du dépôt inchangés. Ce test ne vaut pas autorisation de mise en service.');
process.exitCode = resultat.status === 0 && !/^SUSPENDU/m.test(sortie) ? 0 : 1;
