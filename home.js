/* =========================================================
   Inicio estilo Instagram
   - Intro en video (intro.js) → el logo vuela al header.
   - Perfil de la marca + historias destacadas (visor de historias).
   - Apartados en pestañas: Tienda · Drop 01 · Guardados · Nosotros.
   - Cada prenda abre una "publicación" con tallas y botón de compra.
   ========================================================= */
(function () {
  const { $, $$, esc, icon } = SF;
  SF.mountStylePanel();
  SF.mountLayout();

  const app = $('[data-app]');
  const main = SF.getProduct('p-0001');
  const active = SF.catalog.filter(p => p.status === 'active');
  const soon = SF.catalog.filter(p => p.status === 'coming_soon');

  /* ---------------- Intro ---------------- */
  SF.runIntro({ onDone: () => requestAnimationFrame(() => app.classList.add('is-in')) });

  /* ---------------- Perfil ---------------- */
  $('[data-iso]').innerHTML = SF.isoSVG;
  $('[data-handle]').textContent = SF.config.brand.handle;
  $('[data-free]').textContent = SF.money(SF.config.shipping.freeFrom);
  $('[data-stats]').innerHTML = `<li><b>${active.length}</b> ${active.length === 1 ? 'prenda' : 'prendas'}</li><li><b>${new Set(SF.catalog.map(p => p.drop)).size}</b> drops</li><li><b>${soon.length}</b> próximamente</li>`;

  const followBtn = $('[data-follow]');
  const syncFollow = () => {
    const u = SF.auth.user();
    followBtn.textContent = u ? 'Siguiendo' : 'Seguir';
    followBtn.classList.toggle('btn--accent', !u); followBtn.classList.toggle('btn--ghost', !!u);
  };
  const follow = (e) => { e && e.preventDefault(); SF.auth.user() ? (location.href = 'cuenta.html') : SF.openAuth('register'); };
  followBtn.addEventListener('click', follow);
  $('[data-follow-link]').addEventListener('click', follow);
  SF.auth.onChange(syncFollow); syncFollow();
  $('[data-message]').addEventListener('click', () => { const p = $('[data-chat-panel]'); p.hidden = !p.hidden; SF.track('chat_open'); });
  $('[data-share]').addEventListener('click', async () => {
    const data = { title: 'SF Urban', text: 'Mira SF Urban — Drop 01', url: location.origin + location.pathname };
    try { if (navigator.share) await navigator.share(data); else { await navigator.clipboard.writeText(data.url); SF.toast('Enlace copiado ✓'); } } catch {}
  });

  /* ---------------- Historias destacadas ---------------- */
  const img = main.images[0];
  const stories = [
    { id: 'drop', label: 'Drop 01', isNew: true, cover: `<img src="${img}" alt="">`, slides: [
      { img, title: 'Drop 01', text: 'Conjunto Track Burdeos. Paneles curvos y vivos contrastantes.', cta: 'Ver prenda', post: main.id },
      { center: true, title: 'Edición <span class="serif">limitada</span>', text: 'Tallas S a XL · pocas unidades por talla.', cta: 'Comprar', post: main.id },
    ] },
    { id: 'nuevo', label: 'Nuevo', isNew: true, cover: SF.isoSVG, slides: [
      { center: true, title: 'Llegamos', text: 'SF Urban: activewear para mujer y hombre, hecho para moverse por la ciudad.' },
      { center: true, title: '<span class="serif">Dos letras,</span> un solo movimiento', text: 'Así nace nuestro logo: la S y la F comparten un mismo trazo.' },
    ] },
    { id: 'proximo', label: 'Próximo', cover: `<img src="${img}" alt="" style="filter:brightness(0) invert(.2)">`, slides: [
      { img, mystery: true, title: 'Muy pronto', text: 'Nuevas piezas en camino. Únete al club y entérate primero.', cta: 'Avísame', action: 'follow' },
    ] },
    { id: 'tallas', label: 'Tallas', cover: '<span class="big">S·XL</span>', slides: [
      { center: true, title: 'Guía de tallas', text: 'Fit oversized. Si buscas un look más ajustado, pide una talla menos. Tabla de medidas detallada muy pronto.' },
    ] },
    { id: 'envios', label: 'Envíos', cover: icon.bag, slides: [
      { center: true, title: 'Envíos', text: `Envío nacional en 1–3 días hábiles. Gratis desde ${SF.money(SF.config.shipping.freeFrom)}.` },
      { center: true, title: 'Cambios', text: '30 días para cambios con etiquetas.' },
    ] },
    { id: 'club', label: 'Club', cover: icon.user, slides: [
      { center: true, title: 'SF <span class="serif">Club</span>', text: 'Acceso anticipado a cada drop, favoritos guardados y seguimiento de pedidos.', cta: 'Unirme', action: 'follow' },
    ] },
  ];
  const seenStories = new Set(SF.db.kv.get('storiesSeen', []));
  const hlBox = $('[data-highlights]');
  const renderHL = () => {
    hlBox.innerHTML = stories.map(s => `<button class="hl ${s.isNew && !seenStories.has(s.id) ? 'is-new' : ''}" data-story="${s.id}"><span class="hl__ring"><span class="hl__in">${s.cover}</span></span>${esc(s.label)}</button>`).join('');
    $('.avatar').classList.toggle('is-seen', seenStories.has('drop'));
  };
  renderHL();

  const viewer = $('[data-story-viewer]');
  let st = null; // { story, i, t0, raf, paused }
  const DUR = 5000;
  function openStory(id) {
    const story = stories.find(s => s.id === id); if (!story) return;
    st = { story, i: 0 }; viewer.classList.add('is-open'); viewer.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('no-scroll');
    seenStories.add(id); SF.db.kv.set('storiesSeen', [...seenStories]); renderHL();
    SF.track('story_view', { story: id });
    showSlide();
  }
  function closeStory() {
    if (!st) return; cancelAnimationFrame(st.raf); st = null;
    viewer.classList.remove('is-open'); viewer.setAttribute('aria-hidden', 'true');
    document.documentElement.classList.remove('no-scroll');
  }
  function showSlide() {
    const { story, i } = st; const s = story.slides[i];
    viewer.innerHTML = `
      <div class="story__frame">
        <div class="story__bars">${story.slides.map((_, k) => `<i><b style="width:${k < i ? 100 : 0}%"></b></i>`).join('')}</div>
        <div class="story__head"><span class="pm-av">${SF.isoSVG}</span>${esc(SF.config.brand.handle)} <span class="muted">· ${esc(story.label)}</span><button class="icon-btn" data-story-close aria-label="Cerrar">${icon.close}</button></div>
        <div class="story__slide ${s.center ? 'is-center' : ''}">
          ${s.img ? `<img src="${s.img}" alt="" style="${s.mystery ? 'filter:brightness(0) invert(.12)' : ''}">` : ''}
          <div class="txt"><h3>${s.title}</h3><p>${esc(s.text)}</p>${s.cta ? `<button class="btn btn--accent" data-story-cta>${esc(s.cta)} ${icon.arrow}</button>` : ''}</div>
        </div>
        <button class="story__nav story__nav--prev" data-story-prev aria-label="Anterior"></button>
        <button class="story__nav story__nav--next" data-story-next aria-label="Siguiente"></button>
      </div>`;
    const bar = $$('.story__bars b', viewer)[i];
    const t0 = performance.now();
    const tick = (now) => {
      if (!st) return;
      const p = Math.min(1, (now - t0) / DUR); bar.style.width = p * 100 + '%';
      if (p >= 1) return step(1);
      st.raf = requestAnimationFrame(tick);
    };
    st.raf = requestAnimationFrame(tick);
    const cta = $('[data-story-cta]', viewer);
    if (cta) cta.onclick = () => { const post = s.post, act = s.action; closeStory(); if (post) openPost(post); if (act === 'follow') follow(); };
  }
  function step(d) {
    if (!st) return; cancelAnimationFrame(st.raf);
    const n = st.i + d;
    if (n < 0) { st.i = 0; showSlide(); return; }
    if (n >= st.story.slides.length) { closeStory(); return; }
    st.i = n; showSlide();
  }
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-story]'); if (t) { openStory(t.dataset.story); return; }
    if (e.target.closest('[data-story-close]') || e.target === viewer) closeStory();
    else if (e.target.closest('[data-story-next]')) step(1);
    else if (e.target.closest('[data-story-prev]')) step(-1);
  });
  addEventListener('keydown', (e) => {
    if (st) { if (e.key === 'Escape') closeStory(); if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }
    else if (e.key === 'Escape') closePost();
  });

  /* ---------------- Publicación (ficha rápida) ---------------- */
  const pm = $('[data-post-modal]');
  function openPost(id) {
    const p = SF.getProduct(id); if (!p || p.status !== 'active') return;
    let size = null; const wish = SF.wish.has(p.id);
    pm.innerHTML = `
      <div class="post-modal__card">
        <div class="post-modal__media"><img src="${p.images[0]}" alt="${esc(p.name)}"></div>
        <div class="post-modal__side">
          <div class="pm-head"><span class="pm-av">${SF.isoSVG}</span><div><strong>${esc(SF.config.brand.handle)}</strong><small>${esc(p.drop)} · ${esc(p.colors[0].name)}</small></div><button class="icon-btn" data-pm-close aria-label="Cerrar">${icon.close}</button></div>
          <div class="pm-body">
            <div class="card__badges">${p.badges.map((b, k) => `<span class="tag ${k ? '' : 'tag--accent'}">${esc(b)}</span>`).join('')}</div>
            <h2>${esc(p.name)}</h2>
            <div class="pm-price">${SF.money(p.price)}</div>
            <p class="muted" style="margin:0">${esc(p.description)}</p>
            <div><div class="pdp__opt" style="margin:6px 0 8px"><span>Talla <span class="muted" data-pm-size>— elige una</span></span></div>
            <div class="sizes">${p.sizes.map(s => `<button class="size" data-pm-s="${s}" ${p.stock?.[s] ? '' : 'disabled'}>${s}</button>`).join('')}</div></div>
          </div>
          <div class="pm-foot">
            <div class="pm-icons">
              <button class="icon-btn ${wish ? 'is-on' : ''}" data-wish="${p.id}" aria-pressed="${wish}" aria-label="Favorito">${icon.heart}</button>
              <button class="icon-btn" data-pm-share aria-label="Compartir">${icon.share}</button>
              <a class="icon-btn" href="producto.html?id=${p.id}" aria-label="Ver ficha completa" style="margin-left:auto">${icon.bookmark}</a>
            </div>
            <button class="btn btn--accent btn--block" data-pm-add>Añadir a la bolsa</button>
            <a class="link-btn" href="producto.html?id=${p.id}" style="text-align:center">Ver ficha completa</a>
          </div>
        </div>
      </div>`;
    pm.classList.add('is-open'); pm.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('no-scroll');
    SF.track('product_view', { productId: p.id, from: 'post' });
    $$('[data-pm-s]', pm).forEach(b => b.onclick = () => {
      size = b.dataset.pmS; $$('[data-pm-s]', pm).forEach(x => x.classList.toggle('is-on', x === b));
      $('[data-pm-size]', pm).textContent = '— ' + size;
    });
    $('[data-pm-add]', pm).onclick = () => {
      if (!size) { SF.toast('Elige una talla primero', 'err'); return; }
      try { SF.cart.add(p.id, size); SF.bump(); closePost(); SF.toast(`${p.name} (${size}) en tu bolsa`); setTimeout(() => SF.open('cart'), 250); }
      catch (ex) { SF.toast(ex.message, 'err'); }
    };
    $('[data-pm-share]', pm).onclick = async () => {
      const url = location.origin + location.pathname.replace(/[^/]*$/, '') + 'producto.html?id=' + p.id;
      try { if (navigator.share) await navigator.share({ title: p.name, url }); else { await navigator.clipboard.writeText(url); SF.toast('Enlace copiado ✓'); } } catch {}
    };
  }
  function closePost() { if (!pm.classList.contains('is-open')) return; pm.classList.remove('is-open'); pm.setAttribute('aria-hidden', 'true'); document.documentElement.classList.remove('no-scroll'); }
  pm.addEventListener('click', (e) => { if (e.target === pm || e.target.closest('[data-pm-close]')) closePost(); });

  /* ---------------- Apartados (pestañas) ---------------- */
  const tabs = [
    { id: 'tienda', label: 'Tienda', icon: icon.grid },
    { id: 'drop', label: 'Drop 01', icon: icon.play },
    { id: 'guardados', label: 'Guardados', icon: icon.bookmark },
    { id: 'nosotros', label: 'Nosotros', icon: icon.info },
  ];
  const tabBox = $('[data-tabs]'), view = $('[data-view]');
  tabBox.innerHTML = tabs.map(t => `<button class="ig-tab" role="tab" data-tab="${t.id}" aria-label="${t.label}">${t.icon}<span>${t.label}</span></button>`).join('');
  let cat = 'all', sort = 'new';

  const postTile = (p) => p.status === 'active'
    ? `<button class="post" data-post="${p.id}" aria-label="${esc(p.name)}, ${SF.money(p.price)}">
        <img src="${p.images[0]}" alt="" loading="lazy">
        <span class="post__corner">${p.badges[0] ? `<span class="tag tag--accent">${esc(p.badges[0])}</span>` : ''}</span>
        <span class="post__over"><strong>${esc(p.name)}</strong><span>${SF.money(p.price)}</span></span>
      </button>`
    : `<button class="post post--soon" data-notify="${p.id}" aria-label="Próximamente: avísame"><span><span class="num">${String(SF.catalog.indexOf(p) + 1).padStart(2, '0')}</span><span class="lbl">Próximamente</span></span></button>`;

  const views = {
    tienda() {
      let list = SF.catalog.filter(p => cat === 'all' || p.category === cat);
      const a = list.filter(p => p.status === 'active'), s = list.filter(p => p.status !== 'active');
      if (sort === 'price-asc') a.sort((x, y) => x.price - y.price);
      if (sort === 'price-desc') a.sort((x, y) => y.price - x.price);
      list = [...a, ...s];
      return `
        <div class="view-bar">
          <div class="chips">${[{ id: 'all', label: 'Todo' }, ...SF.categories].map(c => `<button class="chip ${c.id === cat ? 'is-on' : ''}" data-cat="${c.id}">${c.label}</button>`).join('')}</div>
          <select class="select" data-sort aria-label="Ordenar"><option value="new">Recientes</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select>
        </div>
        <div class="ig-grid">${list.length ? list.map(postTile).join('') : '<div class="empty-grid">Nada por aquí todavía.</div>'}</div>`;
    },
    drop() {
      const f = main.features;
      const col = (arr, start, side) => `<div class="inside__col inside__col--${side}">${arr.map((x, k) => `<div class="callout" data-f="${start + k}" style="--d:${0.2 + (start + k) * 0.1}s"><b><i>0${start + k + 1}</i>${esc(x.title)}</b><span>${esc(x.text)}</span></div>`).join('')}</div>`;
      return `
        <div class="drop-head"><span class="eyebrow">Drop 01 · ${esc(main.name)}</span><h2 class="display h-m mt-1">Qué hay <span class="serif">dentro</span></h2><p>Pasa por los puntos para conocer cada detalle.</p></div>
        <div class="inside" data-inside>
          ${col(f.slice(0, 3), 0, 'l')}
          <div class="inside__figure"><div class="inside__ring"></div><img src="${main.images[0]}" alt="${esc(main.name)}">
            ${f.map((x, i) => `<button class="hotspot" data-f="${i}" style="left:${x.x}%;top:${x.y}%;--d:${0.15 + i * 0.1}s" aria-label="${esc(x.title)}"></button>`).join('')}</div>
          ${col(f.slice(3), 3, 'r')}
        </div>
        <div class="drop-cta"><button class="btn btn--accent" data-post="${main.id}">Comprar · ${SF.money(main.price)}</button><a class="btn btn--ghost" href="producto.html?id=${main.id}">Ficha completa</a></div>`;
    },
    guardados() {
      const list = SF.wish.list().map(SF.getProduct).filter(Boolean);
      if (!list.length) return `<div class="empty"><div class="empty__icon">${icon.bookmark}</div><h3>Guarda tus favoritas</h3><p>Toca el ♡ en cualquier prenda para verla aquí.</p></div>`;
      return `<div class="ig-grid">${list.map(postTile).join('')}</div>`;
    },
    nosotros() {
      const b = SF.config.brand;
      return `<div class="about">
        <p class="about__quote">Somos dos personas con una idea fija: ropa para <em>moverse</em> por la ciudad, con actitud y sin ruido.</p>
        <div class="rows">
          <div class="row"><span>Qué hacemos</span><span>Activewear urbano para mujer y hombre</span></div>
          <div class="row"><span>Envíos</span><span>Nacional · 1–3 días hábiles · gratis desde ${SF.money(SF.config.shipping.freeFrom)}</span></div>
          <div class="row"><span>Cambios</span><span>30 días con etiquetas</span></div>
          <div class="row"><span>Pagos</span><span>En línea muy pronto</span></div>
          <div class="row"><span>Contacto</span><span><a href="mailto:${esc(b.email)}">${esc(b.email)}</a></span></div>
        </div>
      </div>`;
    },
  };

  function render(id) {
    if (!views[id]) id = 'tienda';
    $$('[data-tab]', tabBox).forEach(b => { const on = b.dataset.tab === id; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on); });
    view.innerHTML = `<div class="panel-view">${views[id]()}</div>`;
    const sel = $('[data-sort]', view); if (sel) sel.value = sort;
    const ins = $('[data-inside]', view);
    if (ins) {
      requestAnimationFrame(() => setTimeout(() => ins.classList.add('is-in'), 60));
      const hi = (i) => $$('[data-f]', ins).forEach(el => el.classList.toggle('is-active', el.dataset.f === String(i)));
      ins.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-f]'); hi(t ? t.dataset.f : -1); });
      ins.addEventListener('mouseleave', () => hi(-1));
    }
    SF.track('tab_view', { tab: id });
  }
  const current = () => (location.hash || '#tienda').slice(1);
  function go(id, scroll) {
    if (current() !== id) history.replaceState(null, '', '#' + id);
    render(id);
    if (scroll) { const y = tabBox.getBoundingClientRect().top + scrollY - (SF.$('.site-header').offsetHeight); if (scrollY > y) scrollTo({ top: y }); }
  }
  tabBox.addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab, true); });
  addEventListener('hashchange', () => { const id = current(); if (id === 'club') return; render(id); });

  view.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-post]'), n = e.target.closest('[data-notify]');
    if (c) { cat = c.dataset.cat; render('tienda'); SF.track('filter', { category: cat }); }
    if (p) openPost(p.dataset.post);
    if (n) {
      const u = SF.auth.user();
      if (!u) { SF.openAuth('register'); SF.toast('Crea tu cuenta y te avisamos cuando llegue', 'info'); return; }
      if (!SF.db.where('notify', x => x.userId === u.id && x.productId === n.dataset.notify).length) SF.db.insert('notify', { userId: u.id, productId: n.dataset.notify });
      SF.track('notify_me', { productId: n.dataset.notify }); SF.toast('Listo: te avisaremos cuando llegue ✦');
    }
  });
  view.addEventListener('change', (e) => { if (e.target.matches('[data-sort]')) { sort = e.target.value; render('tienda'); } });
  SF.cart.onChange(() => { if (current() === 'guardados') render('guardados'); });

  render(current() === 'club' ? 'tienda' : current());
  if (location.hash === '#club') follow();
})();
