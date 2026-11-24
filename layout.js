/* =========================================================
   Layout compartido: barra de anuncios, header, footer, menú móvil,
   buscador, carrito lateral, modal de cuenta, toasts, chat.
   Se inyecta en todas las páginas (data-page en <body>).
   ========================================================= */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  SF.$ = $; SF.$$ = $$;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SF.esc = esc;

  const icon = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
    heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/></svg>',
    bag: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v11H9l-5 4V5z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  };
  SF.icon = icon;

  const logo = `<a href="index.html" class="logo" aria-label="SF Urban, inicio"><span class="logo__sf">SF</span><span class="logo__urban">URBAN</span></a>`;
  SF.logo = logo;

  function header() {
    return `
    <div class="announce" role="region" aria-label="Anuncios">
      <div class="announce__track">
        ${Array(2).fill(`<span>Envío gratis desde ${SF.money(SF.config.shipping.freeFrom)}</span><span>✦</span><span>Drop 01 ya disponible</span><span>✦</span><span>Regístrate y recibe acceso anticipado</span><span>✦</span><span>Hecho para la calle</span><span>✦</span>`).join('')}
      </div>
    </div>
    <header class="site-header" id="siteHeader">
      <div class="site-header__inner">
        <button class="icon-btn only-mobile" data-open="menu" aria-label="Abrir menú">${icon.menu}</button>
        ${logo}
        <nav class="main-nav" aria-label="Principal">
          <a href="index.html#drop">Drop 01</a>
          <a href="index.html#tienda">Tienda</a>
          <a href="index.html#categorias">Categorías</a>
          <a href="index.html#nosotros">Nosotros</a>
        </nav>
        <div class="header-actions">
          <button class="icon-btn" data-open="search" aria-label="Buscar">${icon.search}</button>
          <button class="icon-btn" data-account aria-label="Mi cuenta">${icon.user}<span class="dot" data-user-dot hidden></span></button>
          <a class="icon-btn hide-mobile" href="cuenta.html#favoritos" aria-label="Favoritos">${icon.heart}<span class="badge" data-wish-count hidden>0</span></a>
          <button class="icon-btn" data-open="cart" aria-label="Carrito">${icon.bag}<span class="badge" data-cart-count hidden>0</span></button>
        </div>
      </div>
    </header>`;
  }

  function footer() {
    const b = SF.config.brand;
    return `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-big" aria-hidden="true"><span data-fit>SF URBAN</span></div>
        <div class="footer-grid">
          <div>
            ${logo}
            <p class="muted mt-1">${esc(b.tagline)}. Ropa para quienes visten la ciudad a su manera.</p>
          </div>
          <div><h4>Tienda</h4><a href="index.html#tienda">Todo</a><a href="index.html#drop">Drop 01</a><a href="index.html#categorias">Categorías</a></div>
          <div><h4>Ayuda</h4><a href="#" data-soon="Guía de tallas">Guía de tallas</a><a href="#" data-soon="Envíos y devoluciones">Envíos y devoluciones</a><a href="mailto:${esc(b.email)}">Contacto</a></div>
          <div><h4>Síguenos</h4><a href="${esc(b.instagram)}" target="_blank" rel="noopener">Instagram</a><a href="${esc(b.tiktok)}" target="_blank" rel="noopener">TikTok</a></div>
        </div>
        <div class="footer-bottom"><span>© ${new Date().getFullYear()} ${esc(b.name)}. Todos los derechos reservados.</span><span><a href="#" data-soon="Términos">Términos</a> · <a href="#" data-soon="Privacidad">Privacidad</a></span></div>
      </div>
    </footer>`;
  }

  function overlays() {
    return `
    <div class="scrim" data-scrim hidden></div>

    <aside class="drawer drawer--left" id="menuDrawer" aria-label="Menú" aria-hidden="true">
      <div class="drawer__head">${logo}<button class="icon-btn" data-close aria-label="Cerrar">${icon.close}</button></div>
      <nav class="mobile-nav">
        <a href="index.html#drop" data-close>Drop 01</a><a href="index.html#tienda" data-close>Tienda</a>
        <a href="index.html#categorias" data-close>Categorías</a><a href="index.html#nosotros" data-close>Nosotros</a>
        <a href="cuenta.html">Mi cuenta</a><a href="cuenta.html#favoritos">Favoritos</a>
      </nav>
    </aside>

    <aside class="drawer drawer--right" id="cartDrawer" aria-label="Carrito" aria-hidden="true">
      <div class="drawer__head"><h3>Tu bolsa <span class="muted" data-cart-count-text></span></h3><button class="icon-btn" data-close aria-label="Cerrar">${icon.close}</button></div>
      <div class="cart-body" data-cart-body></div>
      <div class="cart-foot" data-cart-foot></div>
    </aside>

    <div class="search-overlay" id="searchOverlay" aria-hidden="true">
      <div class="container">
        <div class="search-bar">${icon.search}<input type="search" placeholder="Busca prendas, drops, categorías…" aria-label="Buscar" data-search-input><button class="icon-btn" data-close aria-label="Cerrar">${icon.close}</button></div>
        <div class="search-results" data-search-results></div>
      </div>
    </div>

    <div class="modal" id="authModal" role="dialog" aria-modal="true" aria-labelledby="authTitle" aria-hidden="true">
      <div class="modal__card">
        <button class="icon-btn modal__x" data-close aria-label="Cerrar">${icon.close}</button>
        <div class="auth-side" aria-hidden="true"><div class="auth-side__txt">Únete al<br><em>club</em></div><img src="drop01-conjunto-burdeos.png" alt=""></div>
        <div class="auth-main">
          <div class="tabs" role="tablist">
            <button role="tab" class="tab is-active" data-auth-tab="login">Iniciar sesión</button>
            <button role="tab" class="tab" data-auth-tab="register">Crear cuenta</button>
          </div>
          <h3 id="authTitle" class="sr-only">Cuenta</h3>
          <form class="form" data-auth-form="login" novalidate>
            <label>Correo<input name="email" type="email" autocomplete="email" required></label>
            <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
            <button type="button" class="link-btn" data-auth-tab="reset">¿Olvidaste tu contraseña?</button>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Entrar</button>
          </form>
          <form class="form" data-auth-form="register" novalidate hidden>
            <label>Nombre<input name="name" autocomplete="name" required></label>
            <label>Correo<input name="email" type="email" autocomplete="email" required></label>
            <div class="form-row">
              <label>Celular <span class="muted">(opcional)</span><input name="phone" type="tel" autocomplete="tel"></label>
              <label>Cumpleaños <span class="muted">(opcional)</span><input name="birthdate" type="date"></label>
            </div>
            <label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="8" required><small class="muted">Mínimo 8 caracteres.</small></label>
            <label class="check"><input type="checkbox" name="marketing" checked> Quiero enterarme de drops y descuentos</label>
            <label class="check"><input type="checkbox" name="terms" required> Acepto términos y política de privacidad</label>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Crear cuenta</button>
          </form>
          <form class="form" data-auth-form="reset" novalidate hidden>
            <p class="muted">Te enviaremos un enlace para restablecerla.</p>
            <label>Correo<input name="email" type="email" required></label>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Enviar enlace</button>
            <button type="button" class="link-btn" data-auth-tab="login">← Volver</button>
          </form>
        </div>
      </div>
    </div>

    <div class="toasts" aria-live="polite" data-toasts></div>

    <button class="chat-fab" data-chat aria-label="Chatea con nosotros">${icon.chat}<span>¿Te ayudamos?</span></button>
    <div class="chat-panel" data-chat-panel hidden>
      <div class="chat-panel__head"><strong>SF Urban</strong><span class="muted">Responde en minutos</span><button class="icon-btn" data-chat-close aria-label="Cerrar">${icon.close}</button></div>
      <div class="chat-panel__body">
        <div class="bubble">¡Hola! 👋 Pronto tendremos asistente en línea y WhatsApp. Mientras tanto, ¿en qué te ayudamos?</div>
        <div class="chips"><button data-soon="Asistente de tallas">Guía de tallas</button><button data-soon="Seguimiento de pedidos">Mi pedido</button><button data-soon="WhatsApp">Hablar por WhatsApp</button></div>
      </div>
    </div>`;
  }

  /* ---------- Toasts ---------- */
  SF.toast = (msg, type = 'ok') => {
    const box = $('[data-toasts]'); if (!box) return;
    const t = document.createElement('div'); t.className = 'toast toast--' + type; t.textContent = msg;
    box.appendChild(t); requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 400); }, 2800);
  };

  /* ---------- Paneles (drawers / overlays / modal) ---------- */
  let lastFocus = null;
  const panels = { menu: '#menuDrawer', cart: '#cartDrawer', search: '#searchOverlay', auth: '#authModal' };
  SF.open = (name) => {
    SF.closeAll(true); lastFocus = document.activeElement;
    const el = $(panels[name]); if (!el) return;
    el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    if (name !== 'search') { $('[data-scrim]').hidden = false; requestAnimationFrame(() => $('[data-scrim]').classList.add('is-on')); }
    document.documentElement.classList.add('no-scroll');
    if (name === 'cart') renderCart();
    setTimeout(() => { const f = el.querySelector('input:not([type=hidden]):not([hidden]), button'); f && f.focus(); }, 60);
  };
  SF.closeAll = (silent) => {
    Object.values(panels).forEach(s => { const el = $(s); if (el) { el.classList.remove('is-open'); el.setAttribute('aria-hidden', 'true'); } });
    const sc = $('[data-scrim]'); if (sc) { sc.classList.remove('is-on'); setTimeout(() => { if (!sc.classList.contains('is-on')) sc.hidden = true; }, 300); }
    document.documentElement.classList.remove('no-scroll');
    if (!silent && lastFocus) lastFocus.focus();
  };

  /* ---------- Carrito ---------- */
  function renderCart() {
    const body = $('[data-cart-body]'), foot = $('[data-cart-foot]'); if (!body) return;
    const lines = SF.cart.detailed(), t = SF.cart.totals();
    $('[data-cart-count-text]').textContent = lines.length ? `(${SF.cart.count()})` : '';
    if (!lines.length) {
      body.innerHTML = `<div class="empty"><div class="empty__icon">${icon.bag}</div><p>Tu bolsa está vacía.</p><a class="btn btn--ghost" href="index.html#tienda" data-close>Ver la tienda</a></div>`;
      foot.innerHTML = ''; return;
    }
    const pct = Math.min(100, (t.subtotal / t.freeFrom) * 100);
    body.innerHTML = `
      <div class="free-ship"><p>${t.missingForFree ? `Te faltan <strong>${SF.money(t.missingForFree)}</strong> para envío gratis` : '¡Tienes <strong>envío gratis</strong>! 🎉'}</p><div class="bar"><span style="width:${pct}%"></span></div></div>
      ${lines.map(l => `
      <div class="cart-line">
        <a href="producto.html?id=${l.productId}" class="cart-line__img"><img src="${l.product.images[0]}" alt="${esc(l.product.name)}"></a>
        <div class="cart-line__info">
          <a href="producto.html?id=${l.productId}" class="cart-line__name">${esc(l.product.name)}</a>
          <span class="muted">Talla ${esc(l.size)} · ${esc(l.product.colors?.[0]?.name || '')}</span>
          <div class="qty" data-line="${l.productId}|${l.size}">
            <button data-q="-1" aria-label="Menos">−</button><span>${l.qty}</span><button data-q="1" aria-label="Más">+</button>
          </div>
        </div>
        <div class="cart-line__end"><strong>${SF.money(l.lineTotal)}</strong><button class="link-btn" data-rm="${l.productId}|${l.size}">Quitar</button></div>
      </div>`).join('')}`;
    foot.innerHTML = `
      <div class="sum-row"><span>Subtotal</span><span>${SF.money(t.subtotal)}</span></div>
      <div class="sum-row muted"><span>Envío</span><span>${t.shipping ? SF.money(t.shipping) : 'Gratis'}</span></div>
      <div class="sum-row sum-row--total"><span>Total</span><span>${SF.money(t.total)}</span></div>
      <a class="btn btn--accent btn--block" href="checkout.html">Finalizar compra ${icon.arrow}</a>`;
  }
  SF.renderCart = renderCart;

  function updateBadges() {
    const c = SF.cart.count(), w = SF.wish.list().length;
    $$('[data-cart-count]').forEach(b => { b.textContent = c; b.hidden = !c; });
    $$('[data-wish-count]').forEach(b => { b.textContent = w; b.hidden = !w; });
    const u = SF.auth.user(); $$('[data-user-dot]').forEach(d => d.hidden = !u);
    if ($('#cartDrawer')?.classList.contains('is-open')) renderCart();
  }
  SF.bump = () => { const b = $('[data-cart-count]'); if (b) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } };

  /* ---------- Buscador ---------- */
  function search(q) {
    const box = $('[data-search-results]'); q = q.trim().toLowerCase();
    if (!q) { box.innerHTML = `<p class="muted">Sugerencias: <button class="chip" data-q="conjunto">conjunto</button> <button class="chip" data-q="burdeos">burdeos</button> <button class="chip" data-q="drop">drop 01</button></p>`; return; }
    const res = SF.catalog.filter(p => p.status === 'active' && [p.name, p.category, p.drop, p.description, ...(p.colors || []).map(c => c.name)].join(' ').toLowerCase().includes(q));
    SF.track('search', { q });
    box.innerHTML = res.length ? res.map(p => `<a class="search-hit" href="producto.html?id=${p.id}"><img src="${p.images[0]}" alt=""><span><strong>${esc(p.name)}</strong><br><span class="muted">${SF.money(p.price)}</span></span></a>`).join('')
      : `<p class="muted">No encontramos “${esc(q)}”… todavía. Vienen más prendas pronto.</p>`;
  }

  /* ---------- Auth modal ---------- */
  function authTab(name) {
    $$('[data-auth-form]').forEach(f => f.hidden = f.dataset.authForm !== name);
    $$('.tab[data-auth-tab]').forEach(t => t.classList.toggle('is-active', t.dataset.authTab === name));
    $$('[data-auth-form] [data-error]').forEach(e => e.textContent = '');
  }
  SF.openAuth = (tab = 'login') => { authTab(tab); SF.open('auth'); };

  async function onAuthSubmit(e) {
    e.preventDefault(); const f = e.target; const type = f.dataset.authForm; const err = f.querySelector('[data-error]');
    const data = Object.fromEntries(new FormData(f)); err.textContent = '';
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try {
      if (type === 'register') {
        if (!f.terms.checked) throw new Error('Debes aceptar los términos.');
        const u = await SF.auth.register({ ...data, marketing: f.marketing.checked });
        SF.closeAll(); SF.toast(`¡Bienvenid@ al club, ${u.name.split(' ')[0]}!`);
      } else if (type === 'login') {
        const u = await SF.auth.login(data); SF.closeAll(); SF.toast(`Hola de nuevo, ${u.name.split(' ')[0]} 👋`);
      } else { await SF.auth.requestReset(data.email); SF.toast('Si el correo existe, te llegará un enlace.'); authTab('login'); }
      f.reset();
    } catch (ex) { err.textContent = ex.message; }
    btn.disabled = false;
  }

  /* ---------- Header al hacer scroll ---------- */
  function headerScroll() {
    const h = $('#siteHeader'); let last = 0;
    addEventListener('scroll', () => {
      const y = scrollY;
      h.classList.toggle('is-scrolled', y > 10);
      h.classList.toggle('is-hidden', y > last && y > 400 && !document.documentElement.classList.contains('no-scroll'));
      last = y;
    }, { passive: true });
  }

  /* ---------- Revelado al hacer scroll ---------- */
  SF.reveal = (root = document) => {
    const io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    $$('[data-reveal]:not(.is-in)', root).forEach(el => io.observe(el));
  };

  /* ---------- Init ---------- */
  SF.mountLayout = () => {
    document.body.insertAdjacentHTML('afterbegin', header());
    document.body.insertAdjacentHTML('beforeend', footer() + overlays());

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-open],[data-close],[data-scrim],[data-account],[data-auth-tab],[data-q],[data-rm],[data-soon],[data-chat],[data-chat-close],[data-wish]');
      if (!t) return;
      if (t.matches('[data-open]')) { e.preventDefault(); SF.open(t.dataset.open); if (t.dataset.open === 'search') search($('[data-search-input]').value); }
      else if (t.matches('[data-close],[data-scrim]')) { SF.closeAll(); }
      else if (t.matches('[data-account]')) { SF.auth.user() ? (location.href = 'cuenta.html') : SF.openAuth('login'); }
      else if (t.matches('[data-auth-tab]')) { authTab(t.dataset.authTab); }
      else if (t.matches('.chip[data-q]')) { const i = $('[data-search-input]'); i.value = t.dataset.q; search(i.value); }
      else if (t.matches('.qty [data-q]')) { const [id, size] = t.closest('[data-line]').dataset.line.split('|'); const l = SF.cart.items().find(i => i.productId === id && i.size === size); SF.cart.setQty(id, size, l.qty + +t.dataset.q); }
      else if (t.matches('[data-rm]')) { const [id, size] = t.dataset.rm.split('|'); SF.cart.remove(id, size); }
      else if (t.matches('[data-soon]')) { e.preventDefault(); SF.toast(`${t.dataset.soon}: disponible muy pronto ✦`, 'info'); }
      else if (t.matches('[data-chat]')) { const p = $('[data-chat-panel]'); p.hidden = !p.hidden; SF.track('chat_open'); }
      else if (t.matches('[data-chat-close]')) { $('[data-chat-panel]').hidden = true; }
      else if (t.matches('[data-wish]')) { e.preventDefault(); const on = SF.wish.toggle(t.dataset.wish); t.classList.toggle('is-on', on); t.setAttribute('aria-pressed', on); SF.toast(on ? 'Guardado en favoritos ♥' : 'Quitado de favoritos', 'info'); }
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape') SF.closeAll(); if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); SF.open('search'); search(''); } });
    $('[data-search-input]').addEventListener('input', (e) => search(e.target.value));
    $$('[data-auth-form]').forEach(f => f.addEventListener('submit', onAuthSubmit));

    SF.cart.onChange(updateBadges); SF.auth.onChange(updateBadges);
    // Texto gigante del footer: se ajusta al ancho exacto con cualquier tipografía
    const fit = () => $$('[data-fit]').forEach(s => { s.style.fontSize = '100px'; const w = s.parentElement.clientWidth * 0.98; s.style.fontSize = (100 * w / s.offsetWidth) + 'px'; });
    fit(); addEventListener('resize', fit); document.fonts && document.fonts.ready.then(fit);

    updateBadges(); headerScroll(); SF.reveal();
    SF.track('page_view', { page: document.body.dataset.page });
  };
})();
