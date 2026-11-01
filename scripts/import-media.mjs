// Copia a public/media las imágenes que usa el contenido, descargándolas de la web
// de WordPress y optimizándolas (tamaño máximo, compresión, rotación EXIF).
//
//   npm run import-media           → descarga solo las que falten
//   npm run import-media -- --all  → vuelve a descargarlas todas
//
// Hay que ejecutarlo antes de apagar WordPress. Se puede lanzar desde GitHub
// (Actions → «Importar imágenes de WordPress») sin instalar nada.

import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SOURCE = process.env.WP_UPLOADS || 'https://jorgedeleonardo.com/wp-content/uploads/';
const ALL = process.argv.includes('--all');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)]);
}

const refs = new Set();
for (const f of walk(path.join(ROOT, 'content'))) {
  for (const m of fs.readFileSync(f, 'utf8').matchAll(/media\/[^\s"')\]]+\.(?:jpe?g|png|webp|gif)/gi)) refs.add(m[0]);
}

let ok = 0, skipped = 0, failed = 0;
for (const ref of [...refs].sort()) {
  const out = path.join(ROOT, 'public', ref);
  if (!ALL && fs.existsSync(out)) { skipped++; continue; }
  const url = SOURCE + ref.replace(/^media\//, '').split('/').map(encodeURIComponent).join('/');
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const input = Buffer.from(await res.arrayBuffer());
    const isCover = /portada|cubierta|jota_ajedrez|Screenshot_20230824/i.test(ref);
    let img = sharp(input).rotate().resize({ width: isCover ? 1000 : 1600, withoutEnlargement: true });
    const ext = path.extname(ref).toLowerCase();
    if (ext === '.png') img = img.png({ compressionLevel: 9, palette: !isCover });
    else if (ext === '.webp') img = img.webp({ quality: 80 });
    else img = img.jpeg({ quality: 80, mozjpeg: true });
    const buf = await img.toBuffer();
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, buf);
    console.log(`✓ ${ref}  ${Math.round(input.length / 1024)} KB → ${Math.round(buf.length / 1024)} KB`);
    ok++;
  } catch (e) {
    console.error(`✗ ${ref}  (${e.message})`);
    failed++;
  }
}
console.log(`\n${ok} descargadas, ${skipped} ya estaban, ${failed} con error`);
if (failed) process.exit(1);
