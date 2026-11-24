/* =========================================================
   Página de inicio
   1) Hero: escenario con pedestal + pilar de luz → la "pantalla"
      se acerca hasta llenar la vista → carrusel de prendas
      controlado por el scroll (inspirado en el video de referencia).
   2) "Qué hay dentro": prenda con puntos y anotaciones.
   3) Catálogo con filtros, espacios reservados y "Avísame".
   ========================================================= */
(function () {
  const { $, $$, esc } = SF;
  SF.mountStylePanel();
  SF.mountLayout();

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------------- HERO ---------------- */
  const main = SF.getProduct('p-0001');
  const slides = [
    { product: main, eyebrow: 'Nueva colección', n1: 'Drop', n2: '01', desc: 'Paneles curvos, vivos contrastantes y silueta oversized. El primer drop de SF Urban.', cta: 'Ver prenda', href: 'producto.html?id=' + main.id },
    { mystery: true, flip: true, eyebrow: 'Drop 01 · Pieza 02', n1: 'Muy', n2: 'pronto', desc: 'Estamos terminando los últimos detalles. Únete al club y entérate primero.', cta: 'Avísame', href: '#club' },
    { mystery: true, eyebrow: 'Drop 02', n1: 'En', n2: 'camino', desc: 'Nuevas siluetas, mismo ADN retro. Guarda el espacio.', cta: 'Avísame', href: '#club' },
    { mystery: true, flip: true, eyebrow: 'Drop 02', n1: 'Top', n2: 'secret', desc: 'No podemos contar más… todavía.', cta: 'Avísame', href: '#club' },
  ];
  const hero = $('#hero'), screen = $('[data-hero-screen]'), reel = $('[data-reel]');
  const intro = $('[data-hero-intro]'), ped = $('[data-hero-pedestal]'), pillar = $('[data-hero-pillar]'), hint = $('[data-hero-hint]');
  const big = $('[data-reel-big]'), bar = $('[data-reel-bar]');

  reel.innerHTML = slides.map((s, i) => `
    <div class="reel__item ${s.mystery ? 'is-mystery' : ''}" data-i="${i}" ${s.mystery ? 'aria-hidden="true"' : ''}>
      <div class="reel__shadow"></div>
      <img src="${main.images[0]}" alt="${s.mystery ? '' : esc(main.name)}" style="${s.flip ? 'transform:scaleX(-1)' : ''}" draggable="false">
      ${s.mystery ? '<span class="q">?</span>' : ''}
    </div>`).join('');
  $('[data-reel-total]').textContent = String(slides.length).padStart(2, '0');
  const items = $$('.reel__item', reel);
  items.forEach(el => el.addEventListener('click', () => { const s = slides[+el.dataset.i]; if (!s.mystery) location.href = s.href; }));

  let active = -1;
  function setActive(i) {
    if (i === active) return; const dir = i > active ? 1 : -1; active = i; const s = slides[i];
    const n1 = $('[data-reel-name1]'), n2 = $('[data-reel-name2]');
    [n1, n2].forEach((el, k) => {
      el.style.transition = 'none'; el.style.transform = `translateY(${dir * 105}%)`; el.style.opacity = '0';
      el.textContent = k ? s.n2 : s.n1;
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.transition = ''; el.style.transitionDelay = k * 0.06 + 's'; el.style.transform = ''; el.style.opacity = ''; }));
    });
    $('[data-reel-eyebrow]').textContent = s.eyebrow;
    $('[data-reel-desc]').textContent = s.desc;
    const cta = $('[data-reel-cta]'); cta.firstChild.textContent = s.cta + ' '; cta.href = s.href;
    cta.onclick = s.mystery ? (e) => { e.preventDefault(); SF.auth.user() ? SF.toast('Ya estás en el club: te avisaremos ✦', 'info') : SF.openAuth('register'); } : null;
    $('[data-reel-count]').textContent = String(i + 1).padStart(2, '0');
  }
  setActive(0);

  let geo = {};
  function measure() {
    const vw = innerWidth, vh = hero.querySelector('.hero__sticky').clientHeight;
    const mobile = vw < 900;
    // Se mide sin transformaciones para ubicar la pantalla entre el título y el pedestal
    const introBottom = intro.offsetTop + intro.offsetHeight;
    const pedTop = ped.offsetTop, pedH = ped.offsetHeight;
    const target = pedTop + pedH * 0.22;              // borde inferior de la pantalla
    const s0 = clamp((target - introBottom - 18) / vh, 0.3, mobile ? 0.7 : 0.56);
    const s0w = Math.min(s0, (vw * (mobile ? 0.84 : 0.7)) / vw);
    const ty0 = target - (vh / 2 + (s0w * vh) / 2);
    geo = { vw, vh, mobile, s0: s0w, ty0, spacing: mobile ? vw * 0.62 : vw * 0.27 };
  }

  let p = 0, t0 = performance.now(), heroVisible = true;
  function heroProgress() {
    const r = hero.getBoundingClientRect();
    return clamp(-r.top / (r.height - geo.vh));
  }
  function renderHero(now) {
    const z = reduce ? 1 : easeInOut(clamp(p / 0.36));
    const time = (now - t0) / 1000;
    const bob = reduce ? 0 : Math.sin(time * 1.4) * 7 * (1 - z);
    const s = lerp(geo.s0, 1, z), ty = lerp(geo.ty0, 0, z) + bob, rx = lerp(9, 0, z);
    screen.style.transform = `translateY(${ty}px) rotateX(${rx}deg) scale(${s})`;
    screen.style.borderRadius = `${lerp(22 / s, 0, z)}px`;
    intro.style.opacity = clamp(1 - z * 2.6); intro.style.transform = `translateY(${-z * 80}px)`;
    ped.style.opacity = clamp(1 - z * 1.4); ped.style.transform = `translateX(-50%) translateY(${z * 30}vh) scale(${1 + z * .3})`;
    pillar.style.opacity = clamp(1 - z * 1.6);
    hint.style.opacity = p < 0.03 ? 1 : 0;

    const c = reduce ? 0 : clamp((p - 0.42) / 0.54) * (slides.length - 1);
    items.forEach((el, i) => {
      const off = i - c, a = Math.abs(off);
      const sc = 1 - Math.min(a, 2) * (geo.mobile ? .28 : .3);
      const x = off * geo.spacing * (a > 1 ? 1 - (a - 1) * .18 : 1);
      el.style.transform = `translate(-50%, -50%) translateX(${x}px) perspective(1000px) rotateY(${off * -14}deg) scale(${sc})`;
      el.style.opacity = clamp(1 - Math.max(0, a - .2) * (off < 0 && !geo.mobile ? .85 : .45), 0, 1);
      el.style.zIndex = 10 - Math.round(a);
    });
    big.style.transform = `translate(-50%, -50%) translateX(${-c * 9}vw)`;
    bar.style.width = (c / (slides.length - 1)) * 100 + '%';
    setActive(Math.round(c));
  }
  function loop(now) {
    if (heroVisible) { p = heroProgress(); renderHero(now); }
    requestAnimationFrame(loop);
  }
  if (reduce) hero.style.height = '100vh';
  measure(); addEventListener('resize', () => { measure(); });
  new IntersectionObserver(([en]) => heroVisible = en.isIntersecting).observe(hero);
  requestAnimationFrame(loop);

  /* ---------------- Banda que reacciona al scroll ---------------- */
  const band = $('[data-band]'); let bx = 0, lastY = scrollY, vel = 0;
  (function bandLoop() {
    const y = scrollY; vel = lerp(vel, (y - lastY), 0.1); lastY = y;
    if (!reduce) {
      bx -= 0.6 + Math.abs(vel) * 0.25;
      const half = band.scrollWidth / 2; if (-bx > half) bx += half;
      band.style.transform = `translateX(${bx}px) skewX(${clamp(vel * -0.3, -8, 8)}deg)`;
    }
    requestAnimationFrame(bandLoop);
  })();

  /* ---------------- Qué hay dentro ---------------- */
  const inside = $('[data-inside]');
  const f = main.features;
  const col = (arr, start, side) => `<div class="inside__col inside__col--${side}">${arr.map((x, k) => `<div class="callout" data-f="${start + k}" style="--d:${0.25 + (start + k) * 0.12}s"><b><i>0${start + k + 1}</i>${esc(x.title)}</b><span>${esc(x.text)}</span></div>`).join('')}</div>`;
  inside.innerHTML = `
    ${col(f.slice(0, 3), 0, 'l')}
    <div class="inside__figure">
      <div class="inside__ring"></div>
      <img src="${main.images[0]}" alt="${esc(main.name)} — vista frontal" loading="lazy">
      ${f.map((x, i) => `<button class="hotspot" data-f="${i}" style="left:${x.x}%;top:${x.y}%;--d:${0.2 + i * 0.12}s" aria-label="${esc(x.title)}"></button>`).join('')}
    </div>
    ${col(f.slice(3), 3, 'r')}`;
  new IntersectionObserver(([en], io) => { if (en.isIntersecting) { inside.classList.add('is-in'); io.disconnect(); } }, { threshold: .25 }).observe(inside);
  const hi = (i) => $$('[data-f]', inside).forEach(el => el.classList.toggle('is-active', el.dataset.f === String(i)));
  inside.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-f]'); hi(t ? t.dataset.f : -1); });
  inside.addEventListener('focusin', (e) => { const t = e.target.closest('[data-f]'); if (t) hi(t.dataset.f); });
  inside.addEventListener('mouseleave', () => hi(-1));

  /* ---------------- Catálogo ---------------- */
  const grid = $('[data-grid]'), cats = $('[data-filter-cats]'), sort = $('[data-sort]');
  let cat = 'all';
  cats.innerHTML = `<button class="chip is-on" data-cat="all">Todo</button>` + SF.categories.map(c => `<button class="chip" data-cat="${c.id}">${c.label}</button>`).join('');

  const heart = SF.icon.heart;
  function card(p, idx) {
    if (p.status !== 'active') {
      return `<article class="card card--soon" data-reveal style="--d:${(idx % 4) * .07}s">
        <div class="card__media"><div><div class="num">${String(SF.catalog.indexOf(p) + 1).padStart(2, '0')}</div><div class="soon-lbl">Próximamente</div><button class="btn btn--ghost btn--sm" data-notify="${p.id}">Avísame</button></div></div>
        <div class="card__info"><div><div class="card__name">Espacio reservado</div><div class="card__sub">${esc(SF.categories.find(c => c.id === p.category)?.label || '')} · ${esc(p.drop)}</div></div></div>
      </article>`;
    }
    const wish = SF.wish.has(p.id);
    return `<article class="card" data-reveal style="--d:${(idx % 4) * .07}s">
      <a class="card__media" href="producto.html?id=${p.id}" aria-label="${esc(p.name)}">
        <div class="card__badges">${p.badges.map((b, k) => `<span class="tag ${k ? '' : 'tag--accent'}">${esc(b)}</span>`).join('')}</div>
        <img src="${p.images[0]}" alt="${esc(p.name)}" loading="lazy">
      </a>
      <button class="icon-btn card__wish ${wish ? 'is-on' : ''}" data-wish="${p.id}" aria-pressed="${wish}" aria-label="Guardar en favoritos">${heart}</button>
      <div class="card__quick"><span>Añadir:</span>${p.sizes.map(s => `<button data-add="${p.id}" data-size="${s}" ${p.stock?.[s] ? '' : 'disabled'}>${s}</button>`).join('')}</div>
      <div class="card__info">
        <div><a href="producto.html?id=${p.id}" class="card__name">${esc(p.name)}</a><div class="card__sub"><span class="swatch" style="background:${p.colors[0].hex}"></span>${esc(p.colors[0].name)}</div></div>
        <div class="card__price">${SF.money(p.price)}</div>
      </div>
    </article>`;
  }
  function renderGrid() {
    let list = SF.catalog.filter(p => cat === 'all' || p.category === cat);
    const active = list.filter(p => p.status === 'active'), soon = list.filter(p => p.status !== 'active');
    if (sort.value === 'price-asc') active.sort((a, b) => a.price - b.price);
    if (sort.value === 'price-desc') active.sort((a, b) => b.price - a.price);
    list = [...active, ...soon];
    grid.innerHTML = list.length ? list.map((p, i) => card(p, i)).join('') : `<div class="empty-grid">Nada por aquí todavía.</div>`;
    SF.reveal(grid);
  }
  cats.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; $$('[data-cat]', cats).forEach(x => x.classList.toggle('is-on', x === b)); renderGrid(); SF.track('filter', { category: cat }); });
  sort.addEventListener('change', renderGrid);
  $$('[data-cat-link]').forEach(a => a.addEventListener('click', () => { const b = $(`[data-cat="${a.dataset.catLink}"]`, cats); b && b.click(); }));
  grid.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]'), n = e.target.closest('[data-notify]');
    if (add) {
      try { SF.cart.add(add.dataset.add, add.dataset.size); SF.bump(); SF.toast(`Talla ${add.dataset.size} añadida a tu bolsa`); setTimeout(() => SF.open('cart'), 350); }
      catch (ex) { SF.toast(ex.message, 'err'); }
    }
    if (n) {
      const u = SF.auth.user();
      if (!u) { SF.openAuth('register'); SF.toast('Crea tu cuenta y te avisamos cuando llegue', 'info'); return; }
      if (!SF.db.where('notify', x => x.userId === u.id && x.productId === n.dataset.notify).length) SF.db.insert('notify', { userId: u.id, productId: n.dataset.notify });
      n.textContent = '✓ Te avisaremos'; n.disabled = true; SF.track('notify_me', { productId: n.dataset.notify });
    }
  });
  renderGrid();
  SF.cart.onChange(() => $$('[data-wish]', grid).forEach(b => { const on = SF.wish.has(b.dataset.wish); b.classList.toggle('is-on', on); }));

  /* ---------------- Manifiesto palabra por palabra ---------------- */
  const man = $('[data-manifesto]');
  man.innerHTML = man.innerHTML.split(/(<span[^>]*>.*?<\/span>|\s+)/).map(w => !w.trim() ? w : (w.startsWith('<span') ? w.replace('class="serif"', 'class="serif w"') : `<span class="w">${w}</span>`)).join('');
  const words = $$('.w', man);
  addEventListener('scroll', () => {
    const r = man.getBoundingClientRect(); const pr = clamp((innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35));
    const n = Math.round(pr * words.length); words.forEach((w, i) => w.classList.toggle('on', i < n));
  }, { passive: true });

  /* ---------------- Club ---------------- */
  $('[data-club-register]').addEventListener('click', () => SF.auth.user() ? (location.href = 'cuenta.html') : SF.openAuth('register'));
  $('[data-newsletter]').addEventListener('submit', (e) => {
    e.preventDefault(); const email = e.target.email.value.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return SF.toast('Escribe un correo válido', 'err');
    if (!SF.db.where('newsletter', x => x.email === email).length) SF.db.insert('newsletter', { email, source: 'home' });
    SF.track('newsletter_signup'); e.target.reset(); SF.toast('¡Listo! Te escribiremos con cada drop ✦');
  });
})();
