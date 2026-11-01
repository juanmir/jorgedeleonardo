// Menú móvil, filtros de prensa y vídeos de YouTube que solo se cargan al pulsar.
(() => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      toggle.setAttribute('aria-label', open ? 'Abrir menú' : 'Cerrar menú');
      nav.classList.toggle('is-open', !open);
    });
  }

  const chips = document.querySelectorAll('[data-filter]');
  chips.forEach((chip) => chip.addEventListener('click', () => {
    const f = chip.dataset.filter;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
    document.querySelectorAll('.year-block').forEach((block) => {
      let visible = 0;
      block.querySelectorAll('.press-card').forEach((card) => {
        const show = !f || card.dataset.libro === f;
        card.hidden = !show;
        if (show) visible++;
      });
      block.hidden = visible === 0;
    });
  }));

  document.querySelectorAll('.video-facade').forEach((btn) => btn.addEventListener('click', () => {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${btn.dataset.yt}?autoplay=1&start=${btn.dataset.start || 0}`;
    iframe.title = 'Vídeo';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    btn.replaceWith(iframe);
  }));
})();
