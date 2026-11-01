// Generador de la web de Jorge de Leonardo.
// Lee el contenido de /content (Markdown + YAML) y escribe la web estática en /dist.
//
//   node build.mjs                         → build de pruebas (staging)
//   SITE_ENV=production node build.mjs     → build de producción
//
// Sin frameworks: solo marked (Markdown) y gray-matter (cabeceras YAML).

import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import matter from 'gray-matter';
import { marked } from 'marked';
import { layout } from './src/layout.mjs';
import * as P from './src/pages.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const ENV = process.env.SITE_ENV === 'production' ? 'production' : 'staging';
const WP_UPLOADS = 'https://jorgedeleonardo.com/wp-content/uploads/';

// ---------- utilidades ----------
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const yaml = (p) => matter(`---\n${read(p)}\n---\n`).data;
const md = (s) => marked.parse(s || '');

// Las imágenes viven en public/media (copiadas de WordPress con `npm run import-media`).
// Mientras no estén, en staging se sirven desde la web antigua; en producción es un error.
const missingMedia = new Set();
function media(p) {
  if (!p) return '';
  if (fs.existsSync(path.join(ROOT, 'public', p))) return '/' + p.split('/').map(encodeURIComponent).join('/');
  missingMedia.add(p);
  return WP_UPLOADS + p.replace(/^media\//, '').split('/').map(encodeURIComponent).join('/');
}

function load(dir) {
  return fs.readdirSync(path.join(ROOT, dir))
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data, content } = matter(read(path.join(dir, f)));
      const slug = f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-/, '');
      return { ...data, slug, html: md(content), texto: content };
    });
}

const fecha = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v ?? ''));

// ---------- contenido ----------
const sitio = yaml('content/sitio.yml');
sitio.env = ENV;
// Huella de CSS/JS para que los navegadores descarguen la versión nueva tras cada cambio
sitio.v = crypto.createHash('md5')
  .update(read('src/assets/styles.css') + read('src/assets/site.js')).digest('hex').slice(0, 8);

const libros = load('content/libros')
  .map((l) => ({ ...l, fecha: fecha(l.fecha), url: `/libros/${l.slug}/`, portadaUrl: media(l.portada) }))
  .sort((a, b) => (a.orden ?? 99) - (b.orden ?? 99));
const librosPorSlug = Object.fromEntries(libros.map((l) => [l.slug, l]));

const prensa = load('content/prensa')
  .map((e) => {
    const libro = e.libro ? librosPorSlug[e.libro] : null;
    if (e.libro && !libro) throw new Error(`content/prensa: libro desconocido «${e.libro}» en «${e.slug}»`);
    return {
      ...e,
      fecha: fecha(e.fecha),
      url: `/prensa/${e.slug}/`,
      libroRef: libro,
      fotosUrl: (e.fotos || []).map(media),
      youtube: youtubeId(e.video),
    };
  })
  .sort((a, b) => b.fecha.localeCompare(a.fecha));

const sobreMi = (() => {
  const { data, content } = matter(read('content/sobre-mi.md'));
  return { ...data, html: md(content), fotosUrl: (data.fotos || []).map(media) };
})();
sitio.fotoAutorUrl = media(sitio.foto_autor);

function youtubeId(url) {
  if (!url) return null;
  const m = String(url).match(/(?:v=|youtu\.be\/)([\w-]{11})/);
  if (!m) return null;
  const t = String(url).match(/[?&]t=(\d+)/);
  return { id: m[1], start: t ? Number(t[1]) : 0 };
}

// ---------- escritura ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'src/assets'), path.join(OUT, 'assets'), { recursive: true });

const pages = [];
function page(url, { title, description, body, image, jsonld, noindex }) {
  const html = layout({ sitio, url, title, description, body, image, jsonld, noindex });
  const file = url.endsWith('.html') ? url : path.join(url, 'index.html');
  fs.mkdirSync(path.join(OUT, path.dirname(file)), { recursive: true });
  fs.writeFileSync(path.join(OUT, file), html);
  if (!noindex) pages.push(url);
}

const ctx = { sitio, libros, prensa, sobreMi, librosPorSlug };

page('/', P.inicio(ctx));
page('/libros/', P.libros(ctx));
for (const l of libros) page(l.url, P.libro(ctx, l));
page('/prensa/', P.prensaIndex(ctx));
for (const e of prensa) page(e.url, P.prensaItem(ctx, e));
page('/sobre-mi/', P.sobreMiPage(ctx));
page('/contacto/', P.contacto(ctx));
page('/404.html', { ...P.noEncontrada(ctx), noindex: true });

// sitemap + robots
const base = sitio.url.replace(/\/$/, '');
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.map((u) => `  <url><loc>${base}${u}</loc></url>`).join('\n') + `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'), ENV === 'production'
  ? `User-agent: *\nAllow: /\n\nSitemap: ${base}/sitemap.xml\n`
  : `# Web de pruebas: que no la indexe nadie\nUser-agent: *\nDisallow: /\n`);

// ---------- redirecciones de las URLs antiguas de WordPress ----------
// Se convierten en una CloudFront Function (ver infra/). Las claves van en minúsculas y con / final.
const redirects = {
  '/medios/': '/prensa/',
  '/feed/': '/',
  '/comments/feed/': '/',
  '/home/': '/',
  '/inicio/': '/',
};
const add = (from, to) => {
  let k = from.toLowerCase();
  if (!k.endsWith('/')) k += '/';
  if (redirects[k] && redirects[k] !== to) throw new Error(`Redirección duplicada para ${k}`);
  redirects[k] = to;
};
for (const l of libros) (l.antes || []).forEach((a) => add(a, l.url));
for (const e of prensa) (e.antes || []).forEach((a) => add(a, e.url));
(sobreMi.antes || []).forEach((a) => add(a, '/sobre-mi/'));

const INFRA_OUT = path.join(ROOT, 'dist-infra');
fs.mkdirSync(INFRA_OUT, { recursive: true });
const fnTemplate = read('infra/viewer-request.js');
fs.writeFileSync(path.join(INFRA_OUT, 'viewer-request.js'),
  fnTemplate.replace('/*REDIRECTS*/{}', JSON.stringify(redirects, null, 1)));

// ---------- resumen ----------
console.log(`✓ ${pages.length + 1} páginas en dist/ (${ENV}), ${Object.keys(redirects).length} redirecciones`);
if (missingMedia.size) {
  const msg = `${missingMedia.size} imágenes aún no están en public/media (se cargan desde la web antigua). Ejecuta: npm run import-media`;
  if (ENV === 'production') { console.error('✗ ' + msg); process.exit(1); }
  console.warn('! ' + msg);
}
