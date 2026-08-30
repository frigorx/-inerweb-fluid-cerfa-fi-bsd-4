import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SVG_DIR = path.join(ROOT, 'svg');
const PREVIEW_DIR = path.join(ROOT, 'preview');
const CONTACT = path.join(ROOT, 'APERÇU-PACK-COMPLET.png');
const files = fs.readdirSync(SVG_DIR).filter((name) => name.endsWith('.svg')).sort();

fs.mkdirSync(PREVIEW_DIR, { recursive: true });

const failures = [];
const previews = [];
for (const name of files) {
  const source = fs.readFileSync(path.join(SVG_DIR, name), 'utf8');
  const required = [
    ['viewBox', /viewBox="0 0 1200 720"/],
    ['titre accessible', /<title id="title">[^<]+<\/title>/],
    ['description accessible', /<desc id="desc">[^<]+<\/desc>/],
    ['créateur', /<dc:creator>[^<]+<\/dc:creator>/],
    ['droits', /<dc:rights>[^<]+<\/dc:rights>/],
    ['fond blanc', /<rect width="1200" height="720" fill="white"\/>/],
  ];
  for (const [label, pattern] of required) {
    if (!pattern.test(source)) failures.push(`${name}: ${label} absent ou invalide`);
  }

  const out = path.join(PREVIEW_DIR, name.replace(/\.svg$/, '.png'));
  await sharp(Buffer.from(source)).resize(600, 360, { fit: 'fill' }).png().toFile(out);
  previews.push({ name, out });
}

const columns = 3;
const cardW = 620;
const cardH = 410;
const rows = Math.ceil(previews.length / columns);
const composites = [];

for (let i = 0; i < previews.length; i += 1) {
  const col = i % columns;
  const row = Math.floor(i / columns);
  const label = previews[i].name.replace(/\.svg$/, '');
  const caption = Buffer.from(`<svg width="600" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="38" fill="#F3F7FB"/><text x="12" y="27" font-family="Calibri,Arial,sans-serif" font-size="22" font-weight="700" fill="#1B3A63">${label}</text></svg>`);
  composites.push({ input: previews[i].out, left: col * cardW + 10, top: row * cardH + 8 });
  composites.push({ input: caption, left: col * cardW + 10, top: row * cardH + 370 });
}

await sharp({
  create: { width: columns * cardW, height: rows * cardH, channels: 4, background: '#FFFFFF' },
}).composite(composites).png().toFile(CONTACT);

if (files.length !== 18) failures.push(`Nombre de planches: ${files.length} au lieu de 18`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`QA structurelle: ${files.length}/18 SVG valides`);
  console.log(`Aperçu: ${CONTACT}`);
}
