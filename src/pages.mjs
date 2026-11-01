// Plantillas de cada tipo de página.
import { marked } from 'marked';
import { esc } from './layout.mjs';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesAno = (f) => {
  const [y, m] = String(f).split('-');
  return m ? `${MESES[Number(m) - 1]} de ${y}` : y;
};
const TIPOS = { presentacion: 'Presentación', firma: 'Firma de libros', entrevista: 'Entrevista' };
const tipo = (t) => TIPOS[t] || 'Prensa';
const inline = (s) => marked.parseInline(s || '');
const primerParrafo = (texto) => inline((texto || '').trim().split(/\n\s*\n/)[0]);

// ---------- piezas ----------
function portada(l, { eager = false, sizes = '' } = {}) {
  return `<img class="cover" src="${l.portadaUrl}" alt="Portada de ${esc(l.titulo)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async"${sizes}>`;
}

function estanteria(libros) {
  return `<ul class="shelf-grid">
    ${libros.map((l) => `<li class="shelf-item">
      <a href="${l.url}">
        <span class="cover-frame">${portada(l)}</span>
        <span class="shelf-meta">${esc(l.publico)} · ${l.fecha.slice(0, 4)}</span>
        <span class="shelf-title">${esc(l.titulo)}</span>
      </a>
    </li>`).join('')}
  </ul>`;
}

function tarjetaPrensa(e, { conLibro = true } = {}) {
  const foto = e.fotosUrl[0] || (e.youtube ? `https://i.ytimg.com/vi/${e.youtube.id}/hqdefault.jpg` : null);
  const donde = e.lugar || e.medio || '';
  return `<li class="press-card" data-libro="${e.libro || ''}">
    <a href="${e.url}">
      <span class="press-thumb${foto ? '' : ' press-thumb--empty'}">
        ${foto ? `<img src="${foto}" alt="" loading="lazy" decoding="async">` : `<span>${esc(tipo(e.tipo))}</span>`}
        ${e.youtube ? '<span class="play-badge" aria-hidden="true"></span>' : ''}
      </span>
      <span class="press-body">
        <span class="eyebrow">${tipo(e.tipo)} · ${mesAno(e.fecha)}</span>
        <span class="press-title">${esc(e.titulo)}</span>
        ${donde ? `<span class="press-where">${esc(donde)}</span>` : ''}
        ${conLibro && e.libroRef ? `<span class="press-book">${esc(e.libroRef.titulo)}</span>` : ''}
      </span>
    </a>
  </li>`;
}

function seccion(titulo, contenido, { id = '', mas = '', clase = '' } = {}) {
  return `<section class="section ${clase}"${id ? ` id="${id}"` : ''}>
    <div class="wrap">
      <div class="section-head">
        <h2>${titulo}</h2>
        ${mas}
      </div>
      ${contenido}
    </div>
  </section>`;
}

const personaLD = (sitio) => ({
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: sitio.nombre,
  url: sitio.url,
  jobTitle: 'Escritor',
  birthPlace: 'Logroño',
  sameAs: sitio.redes.map((r) => r.url),
});

// ---------- páginas ----------
export function inicio({ sitio, libros, prensa, sobreMi }) {
  const d = libros.find((l) => l.destacado) || libros[0];
  const body = `
  <section class="hero">
    <div class="wrap hero-grid">
      <div class="hero-text">
        <p class="eyebrow">Nueva novela · ${esc(d.editorial)}, ${d.fecha.slice(0, 4)}</p>
        <h1 class="hero-title">${esc(d.titulo)}</h1>
        <p class="hero-lema">${esc(d.lema)}</p>
        <div class="hero-syn">${primerParrafo(d.texto)}</div>
        <div class="actions">
          <a class="btn" href="${d.url}">Descubre ${esc(d.titulo)}</a>
          <a class="btn btn--ghost" href="${d.url}#comprar">Dónde comprarlo</a>
        </div>
      </div>
      <a class="hero-cover" href="${d.url}" aria-label="${esc(d.titulo)}">
        <span class="cover-frame cover-frame--hero">${portada(d, { eager: true })}</span>
      </a>
    </div>
  </section>

  <section class="intro">
    <div class="wrap intro-grid">
      <figure class="intro-photo">
        <img src="${sitio.fotoAutorUrl}" alt="Jorge de Leonardo" loading="lazy" decoding="async">
      </figure>
      <div class="intro-text">
        <blockquote class="quote">«${esc(sitio.cita)}»</blockquote>
        <p class="lead">${esc(sobreMi.bio_corta)}</p>
        <a class="link-arrow" href="/sobre-mi/">Conoce a Jorge</a>
      </div>
    </div>
  </section>

  ${seccion('Libros', estanteria(libros), { mas: '<a class="link-arrow" href="/libros/">Ver todos</a>' })}

  ${seccion('Agenda y prensa',
    `<ul class="press-grid">${prensa.slice(0, 3).map((e) => tarjetaPrensa(e)).join('')}</ul>`,
    { mas: '<a class="link-arrow" href="/prensa/">Todas las apariciones</a>', clase: 'section--tinted' })}

  ${ctaContacto()}`;

  return {
    title: '',
    body,
    image: d.portadaUrl,
    jsonld: personaLD(sitio),
  };
}

function ctaContacto() {
  return `<section class="cta">
    <div class="wrap cta-inner">
      <div>
        <h2>¿Un encuentro en tu colegio, biblioteca o librería?</h2>
        <p>Presentaciones, firmas y encuentros con lectores para hablar de sus libros y del placer de leer.</p>
      </div>
      <a class="btn btn--light" href="/contacto/">Contactar</a>
    </div>
  </section>`;
}

export function libros({ libros }) {
  const grupos = [
    ['Adultos', 'Para adultos'],
    ['Juvenil', 'Juvenil'],
    ['Infantil', 'Infantil'],
  ];
  const body = `
  <header class="page-head">
    <div class="wrap">
      <p class="eyebrow">Obra</p>
      <h1>Libros</h1>
      <p class="lead">Del misterio infantil de Jota al <em>thriller</em> histórico: historias para lectores de todas las edades.</p>
    </div>
  </header>
  ${grupos.map(([k, t]) => {
    const ls = libros.filter((l) => l.publico === k);
    if (!ls.length) return '';
    return `<section class="section section--tight"><div class="wrap">
      <h2 class="group-title">${t}</h2>
      <div class="book-rows">
        ${ls.map((l) => `<article class="book-row">
          <a class="cover-frame" href="${l.url}">${portada(l)}</a>
          <div>
            <p class="eyebrow">${esc(l.genero)} · ${esc(l.editorial)}, ${l.fecha.slice(0, 4)}</p>
            <h3><a href="${l.url}">${esc(l.titulo)}</a></h3>
            <p class="book-lema">${esc(l.lema)}</p>
            <p>${primerParrafo(l.texto)}</p>
            <a class="link-arrow" href="${l.url}">Más sobre el libro</a>
          </div>
        </article>`).join('')}
      </div>
    </div></section>`;
  }).join('')}`;
  return { title: 'Libros', description: 'Todos los libros de Jorge de Leonardo: novela policíaca, juvenil, infantil y relatos.', body };
}

export function libro({ sitio, libros, prensa }, l) {
  const ficha = [
    ['Género', l.genero],
    ['Público', l.publico],
    ['Editorial', l.editorial],
    ['Colección', l.coleccion],
    ['Publicación', l.fecha && mesAno(l.fecha)],
    ['ISBN', l.isbn],
  ].filter(([, v]) => v);
  const relacionadas = prensa.filter((e) => e.libro === l.slug);
  const otros = libros.filter((x) => x.slug !== l.slug);

  const body = `
  <article class="book">
    <div class="wrap book-grid">
      <div class="book-cover">
        <span class="cover-frame cover-frame--hero">${portada(l, { eager: true })}</span>
      </div>
      <div class="book-main">
        <p class="eyebrow">${esc(l.genero)}</p>
        <h1>${esc(l.titulo)}</h1>
        <p class="book-lema book-lema--big">${esc(l.lema)}</p>
        ${(l.premios || []).map((p) => `<p class="award">${esc(p)}</p>`).join('')}
        <div class="prose">${l.html}</div>
        <section id="comprar" class="buy">
          <h2>Dónde comprarlo</h2>
          <ul class="buy-list">
            ${(l.comprar || []).map((c) => `<li><a href="${c.url}" target="_blank" rel="noopener">${esc(c.tienda)}<span aria-hidden="true">↗</span></a></li>`).join('')}
          </ul>
          <p class="buy-note">También puedes pedirlo en tu librería de confianza${l.isbn ? ` con el ISBN ${esc(l.isbn)}` : ''}.</p>
        </section>
        <dl class="ficha">
          ${ficha.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}
        </dl>
      </div>
    </div>
  </article>
  ${relacionadas.length ? seccion('Presentaciones y prensa',
    `<ul class="press-grid">${relacionadas.map((e) => tarjetaPrensa(e, { conLibro: false })).join('')}</ul>`,
    { clase: 'section--tinted' }) : ''}
  ${seccion('Otros libros', estanteria(otros))}`;

  return {
    title: l.titulo,
    description: `${l.titulo}, de Jorge de Leonardo (${l.editorial}). ${l.lema}`,
    body,
    image: l.portadaUrl,
    jsonld: {
      '@context': 'https://schema.org',
      '@type': 'Book',
      name: l.titulo,
      author: { '@type': 'Person', name: sitio.nombre, url: sitio.url },
      publisher: { '@type': 'Organization', name: l.editorial },
      datePublished: l.fecha,
      isbn: l.isbn,
      genre: l.genero,
      inLanguage: 'es',
      image: l.portadaUrl,
      description: l.lema,
    },
  };
}

export function prensaIndex({ prensa, libros }) {
  const porAno = {};
  for (const e of prensa) (porAno[e.fecha.slice(0, 4)] ||= []).push(e);
  const usados = libros.filter((l) => prensa.some((e) => e.libro === l.slug));
  const body = `
  <header class="page-head">
    <div class="wrap">
      <p class="eyebrow">Agenda y prensa</p>
      <h1>Presentaciones, firmas y entrevistas</h1>
      <p class="lead">Un recorrido por los encuentros con lectores y las apariciones en prensa, radio y televisión.</p>
      <div class="filters" role="group" aria-label="Filtrar por libro">
        <button class="chip" aria-pressed="true" data-filter="">Todos</button>
        ${usados.map((l) => `<button class="chip" aria-pressed="false" data-filter="${l.slug}">${esc(l.titulo)}</button>`).join('')}
      </div>
    </div>
  </header>
  ${Object.keys(porAno).sort().reverse().map((y) => `
    <section class="section section--tight year-block"><div class="wrap">
      <h2 class="group-title">${y}</h2>
      <ul class="press-grid">${porAno[y].map((e) => tarjetaPrensa(e)).join('')}</ul>
    </div></section>`).join('')}`;
  return { title: 'Agenda y prensa', description: 'Presentaciones, firmas de libros y entrevistas de Jorge de Leonardo.', body };
}

export function prensaItem({ prensa }, e) {
  const meta = [e.lugar, e.medio].filter(Boolean).join(' · ');
  const video = e.youtube
    ? `<div class="video">
        <button class="video-facade" data-yt="${e.youtube.id}" data-start="${e.youtube.start}" aria-label="Reproducir vídeo">
          <img src="https://i.ytimg.com/vi/${e.youtube.id}/hqdefault.jpg" alt="" loading="lazy">
          <span class="play-badge play-badge--big" aria-hidden="true"></span>
        </button>
      </div>`
    : '';
  const otras = prensa.filter((x) => x !== e && (e.libro ? x.libro === e.libro : true)).slice(0, 3);
  const body = `
  <article class="press-item">
    <div class="wrap wrap--narrow">
      <a class="back" href="/prensa/">← Agenda y prensa</a>
      <p class="eyebrow">${tipo(e.tipo)} · ${mesAno(e.fecha)}</p>
      <h1>${esc(e.titulo)}</h1>
      ${meta ? `<p class="press-meta">${esc(meta)}</p>` : ''}
      ${e.libroRef ? `<a class="book-chip" href="${e.libroRef.url}">
          <img src="${e.libroRef.portadaUrl}" alt="" loading="lazy"><span><small>Libro</small>${esc(e.libroRef.titulo)}</span></a>` : ''}
      ${video}
      <div class="prose">${e.html}</div>
      ${e.enlace ? `<p><a class="btn btn--ghost" href="${e.enlace}" target="_blank" rel="noopener">${esc(e.enlace_texto || 'Ver más')} ↗</a></p>` : ''}
      ${e.video && !e.youtube ? `<p><a class="btn btn--ghost" href="${e.video}" target="_blank" rel="noopener">Ver vídeo ↗</a></p>` : ''}
    </div>
    ${e.fotosUrl.length ? `<div class="wrap gallery gallery--${Math.min(e.fotosUrl.length, 3)}">
      ${e.fotosUrl.map((f) => `<a href="${f}" target="_blank" rel="noopener"><img src="${f}" alt="${esc(e.titulo)}" loading="lazy" decoding="async"></a>`).join('')}
    </div>` : ''}
  </article>
  ${otras.length ? seccion(e.libro ? 'Más sobre este libro' : 'Más apariciones',
    `<ul class="press-grid">${otras.map((x) => tarjetaPrensa(x)).join('')}</ul>`, { clase: 'section--tinted' }) : ''}`;
  return {
    title: e.titulo,
    description: `${tipo(e.tipo)}${meta ? ' · ' + meta : ''} · ${mesAno(e.fecha)}`,
    body,
    image: e.fotosUrl[0],
  };
}

export function sobreMiPage({ sitio, sobreMi }) {
  const body = `
  <header class="page-head">
    <div class="wrap">
      <p class="eyebrow">${esc(sobreMi.entradilla)}</p>
      <h1>${esc(sobreMi.titulo)}</h1>
    </div>
  </header>
  <section class="section section--flush"><div class="wrap about-grid">
    <div class="about-photos">
      ${sobreMi.fotosUrl.map((f) => `<img src="${f}" alt="Jorge de Leonardo" loading="lazy" decoding="async">`).join('')}
    </div>
    <div class="prose prose--large">${sobreMi.html}</div>
  </div></section>
  ${ctaContacto()}`;
  return { title: 'Sobre mí', description: sobreMi.bio_corta, body, image: sobreMi.fotosUrl[0], jsonld: personaLD(sitio) };
}

export function contacto({ sitio, sobreMi, libros }) {
  const body = `
  <header class="page-head">
    <div class="wrap">
      <p class="eyebrow">Contacto</p>
      <h1>Hablemos</h1>
      <p class="lead">Para encuentros con lectores, visitas a colegios, clubes de lectura, prensa o simplemente para contarle qué te ha parecido un libro.</p>
    </div>
  </header>
  <section class="section section--flush"><div class="wrap contact-grid">
    <div class="card">
      <h2>Escríbele</h2>
      ${sitio.email ? `<p><a class="btn" href="mailto:${esc(sitio.email)}">${esc(sitio.email)}</a></p>` : ''}
      <ul class="social-list">
        ${sitio.redes.map((r) => `<li><a href="${r.url}" target="_blank" rel="me noopener"><strong>${esc(r.nombre)}</strong><span>${esc(r.usuario)}</span></a></li>`).join('')}
      </ul>
    </div>
    <div class="card">
      <h2>Colegios y bibliotecas</h2>
      <p>Jorge es profesor desde 2003 y conoce de primera mano lo que engancha a los lectores más jóvenes. La serie de Jota es literatura infantil y <em>El enigma de las cometas</em>, juvenil.</p>
      <p>Si quieres organizar un encuentro con el autor, escríbele por cualquiera de estos canales.</p>
    </div>
    <div class="card card--wide">
      <h2>Para prensa y librerías</h2>
      <p class="eyebrow">Biografía breve</p>
      <p>${esc(sobreMi.bio_corta)}</p>
      <p class="eyebrow">Material descargable</p>
      <ul class="downloads">
        <li><a href="${sitio.fotoAutorUrl}" download>Foto del autor</a></li>
        ${libros.map((l) => `<li><a href="${l.portadaUrl}" download>Portada · ${esc(l.titulo)}</a></li>`).join('')}
      </ul>
    </div>
  </div></section>`;
  return { title: 'Contacto', description: 'Contacta con el escritor Jorge de Leonardo para encuentros, colegios, librerías o prensa.', body };
}

export function noEncontrada({ libros }) {
  return {
    title: 'Página no encontrada',
    body: `<header class="page-head"><div class="wrap">
      <p class="eyebrow">Error 404</p>
      <h1>Esta página se ha perdido entre las estanterías</h1>
      <p class="lead">Puede que la dirección haya cambiado con la nueva web. Prueba desde aquí:</p>
      <p class="actions"><a class="btn" href="/">Ir al inicio</a> <a class="btn btn--ghost" href="/libros/">Ver los libros</a></p>
    </div></header>
    ${seccion('Libros', estanteria(libros))}`,
  };
}
