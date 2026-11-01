// Estructura común de todas las páginas: <head>, cabecera y pie.

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const NAV = [
  ['/libros/', 'Libros'],
  ['/prensa/', 'Agenda y prensa'],
  ['/sobre-mi/', 'Sobre mí'],
  ['/contacto/', 'Contacto'],
];

export function layout({ sitio, url, title, description, body, image, jsonld, noindex }) {
  const base = sitio.url.replace(/\/$/, '');
  const fullTitle = title ? `${title} · ${sitio.nombre}` : `${sitio.nombre} · Escritor`;
  const desc = description || sitio.descripcion;
  const canonical = base + (url === '/404.html' ? '/' : url);
  const img = image ? (image.startsWith('http') ? image : base + image) : base + '/assets/og.jpg';
  const robots = sitio.env !== 'production' || noindex ? '<meta name="robots" content="noindex, nofollow">' : '';
  const active = (href) => (url.startsWith(href) ? ' aria-current="page"' : '');

  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${canonical}">
${robots}
<meta property="og:type" content="website">
<meta property="og:locale" content="es_ES">
<meta property="og:site_name" content="${esc(sitio.nombre)}">
<meta property="og:title" content="${esc(title || sitio.nombre)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#f6f1e9">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/fonts/Lora-Variable.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/assets/styles.css?v=${sitio.v}">
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ''}
</head>
<body>
<a class="skip" href="#contenido">Saltar al contenido</a>
${sitio.env !== 'production' ? '<div class="staging-bar">Versión de pruebas · no es la web publicada</div>' : ''}
<header class="site-header">
  <div class="wrap header-inner">
    <a class="wordmark" href="/">Jorge de Leonardo</a>
    <button class="nav-toggle" aria-expanded="false" aria-controls="nav" aria-label="Abrir menú">
      <span></span><span></span>
    </button>
    <nav id="nav" class="site-nav" aria-label="Principal">
      ${NAV.map(([h, t]) => `<a href="${h}"${active(h)}>${t}</a>`).join('')}
    </nav>
  </div>
</header>
<main id="contenido">
${body}
</main>
<footer class="site-footer">
  <div class="wrap footer-inner">
    <div>
      <p class="wordmark wordmark--small">Jorge de Leonardo</p>
      <p class="footer-quote">«${esc(sitio.cita)}»</p>
    </div>
    <nav aria-label="Pie">
      ${NAV.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}
    </nav>
    <div class="footer-social">
      ${sitio.redes.map((r) => `<a href="${r.url}" rel="me noopener" target="_blank">${esc(r.nombre)}</a>`).join('')}
    </div>
  </div>
  <div class="wrap footer-legal">© ${new Date().getFullYear()} Jorge de Leonardo. Todos los derechos reservados.</div>
</footer>
<script src="/assets/site.js?v=${sitio.v}" defer></script>
</body>
</html>`;
}
