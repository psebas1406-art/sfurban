/* =========================================================
   Aplicación principal (index.html)
   Intro → logo al header → vistas controladas por la barra flotante:
   #inicio · #explorar · #favoritos · #carrito · #pagos · #perfil
   ========================================================= */
(function () {
  const { $, $$, esc, icon } = SF;
  SF.mountLayout();

  const app = $('[data-app]'), view = $('[data-view]');
  const active = () => SF.catalog.filter(p => p.status === 'active');
  const soon = () => SF.catalog.filter(p => p.status !== 'active');
  const catLabel = (id) => SF.categories.find(c => c.id === id)?.label || '';

  SF.runIntro({ onDone: () => requestAnimationFrame(() => app.classList.add('is-in')) });

  /* ---------------- Piezas reutilizables ---------------- */
  const card = (p) => {
    if (p.status !== 'active') {
      const n = String(SF.catalog.indexOf(p) + 1).padStart(2, '0');
      return `<article class="pcard pcard--soon">
        <div class="pcard__media"><span class="num">${n}</span><span class="lbl">Próximamente</span></div>
        <div class="pcard__info"><span class="pcard__name">Espacio reservado</span></div>
        <div class="pcard__sub">${esc(catLabel(p.category))} · ${esc(p.drop)}</div>
        <button class="btn btn--ghost btn--sm btn--block" data-notify="${p.id}">Avísame</button>
      </article>`;
    }
    const w = SF.wish.has(p.id);
    return `<article class="pcard">
      <a class="pcard__media" href="producto.html?id=${p.id}" aria-label="${esc(p.name)}">
        ${p.images[0] ? `<img src="${p.images[0]}" alt="" loading="lazy">` : ''}
        ${p.badges[0] ? `<span class="tag tag--accent pcard__tag">${esc(p.badges[0])}</span>` : ''}
      </a>
      <button class="icon-btn pcard__wish ${w ? 'is-on' : ''}" data-wish="${p.id}" aria-pressed="${w}" aria-label="Guardar en favoritos">${icon.heart}</button>
      <div class="pcard__info"><a class="pcard__name" href="producto.html?id=${p.id}">${esc(p.name)}</a><span class="pcard__price">${SF.money(p.price)}</span></div>
      <div class="pcard__sub"><span class="swatch" style="background:${p.colors[0].hex}"></span>${esc(p.colors[0].name)}${p.sizes.length ? ` · ${p.sizes[0]}–${p.sizes[p.sizes.length - 1]}` : ''}</div>
    </article>`;
  };
  const head = (title, sub, extra = '') => `<header class="view-head"><div><h1 class="display h-m">${title}</h1>${sub ? `<p class="muted">${sub}</p>` : ''}</div>${extra}</header>`;
  const empty = (ic, title, text, btn) => `<div class="empty"><div class="empty__icon">${icon[ic]}</div><h3>${title}</h3><p>${text}</p>${btn || ''}</div>`;

  /* ---------------- Estado de Explorar ---------------- */
  const ex = { q: '', cat: 'all', size: 'all', sort: 'new', soon: true };

  /* ---------------- Vistas ---------------- */
  const views = {
    inicio() {
      // Catálogo completo: la destacada primero, luego las disponibles y al final las que vienen
      const list = [...active()].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).concat(soon());
      return `
      <section class="story">
        <div class="story__txt">
          <span class="eyebrow">Nuestra historia</span>
          <h1 class="display story__title">SF <span class="serif">Urban</span></h1>
          <p class="story__lead">Todo comienza con una idea y las mismas ganas de salir adelante, crecer y construir algo propio. Un sueño compartido que hoy empieza a convertirse en realidad gracias al esfuerzo, la dedicación y la ilusión de llegar lejos.</p>
          <p class="muted">Así nace <strong>SF Urban</strong>, un proyecto que lleva nuestra esencia y el reflejo de nuestros sueños, con el propósito de ofrecerte estilo, actitud y calidad en cada prenda.</p>
          <p class="story__thanks serif">Gracias por confiar en nosotros y ser parte de esta historia.</p>
          <a class="btn btn--accent story__cta" href="#catalogo" data-to-catalog>Ver catálogo <span class="story__down" aria-hidden="true">↓</span></a>
        </div>
        <div class="story__fig" data-logo3d aria-hidden="true">
          <div class="story__glow"></div>
          <div class="story__orbit story__orbit--a"></div>
          <div class="story__orbit story__orbit--b"></div>
          <div class="story__logo">
            <svg viewBox="240 385 610 440">
              <polygon class="lp lp1" fill="#F5F5F2" points="338,395 897,395 880,479 321,479"/>
              <polygon class="lp lp2" fill="#F5F5F2" points="321,479 406,479 388,563 553,563 500,813 250,813 267,731 436,731 453,647 285,647"/>
              <polygon class="lp lp3" fill="#F5F5F2" points="628,479 713,479 641,813 558,813"/>
              <polygon class="lp lp4" fill="#E4002B" points="697,556 838,604 677,653"/>
            </svg>
          </div>
          <div class="story__shadow"></div>
        </div>
      </section>

      <section class="sec catalog" id="catalogo">
        <div class="sec__head"><h2 class="sec__title">Catálogo</h2><span class="muted">${active().length} ${active().length === 1 ? 'prenda disponible' : 'prendas disponibles'}</span></div>
        <div class="grid2 catalog__grid">${list.map(card).join('')}</div>
      </section>

      <section class="sec club" data-reveal>
        <div>${SF.isoSVG}<h2 class="sec__title">SF <span class="serif">Club</span></h2><p class="muted">Acceso anticipado a cada drop, favoritos guardados y seguimiento de tus pedidos.</p></div>
        <button class="btn btn--accent" data-go="perfil">${SF.auth.user() ? 'Ir a mi perfil' : 'Unirme gratis'} ${icon.arrow}</button>
      </section>`;
    },

    explorar() {
      return `
        ${head('Explorar', `${active().length} ${active().length === 1 ? 'prenda disponible' : 'prendas disponibles'} · ${soon().length} en camino`)}
        <label class="searchbox">${icon.search}<input type="search" placeholder="Busca prendas, colores, drops…" value="${esc(ex.q)}" data-ex-q aria-label="Buscar"></label>
        <div class="filters">
          <div class="chips scroll-x">${[{ id: 'all', label: 'Todo' }, ...SF.categories].map(c => `<button class="chip ${ex.cat === c.id ? 'is-on' : ''}" data-ex-cat="${c.id}">${c.label}</button>`).join('')}</div>
          <div class="filters__row">
            <div class="chips">${['all', 'S', 'M', 'L', 'XL'].map(s => `<button class="chip chip--size ${ex.size === s ? 'is-on' : ''}" data-ex-size="${s}">${s === 'all' ? 'Todas las tallas' : s}</button>`).join('')}</div>
            <div class="filters__end">
              <label class="mini-switch"><input type="checkbox" class="switch" data-ex-soon ${ex.soon ? 'checked' : ''}> Próximamente</label>
              <select class="select" data-ex-sort aria-label="Ordenar"><option value="new">Recientes</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select>
            </div>
          </div>
        </div>
        <div class="grid2" data-ex-results></div>`;
    },

    favoritos() {
      const list = SF.wish.list().map(SF.getProduct).filter(Boolean);
      return `${head('Favoritos', list.length ? `${list.length} ${list.length === 1 ? 'prenda guardada' : 'prendas guardadas'}` : '')}
        ${list.length ? `<div class="grid2">${list.map(card).join('')}</div>`
          : empty('heart', 'Aún no guardas nada', 'Toca el ♡ en cualquier prenda y aparecerá aquí.', `<button class="btn btn--ghost" data-go="explorar">Explorar prendas</button>`)}`;
    },

    carrito() {
      const lines = SF.cart.detailed(), t = SF.cart.totals();
      if (!lines.length) return `${head('Carrito')}${empty('cart', 'Tu carrito está vacío', 'Cuando añadas prendas aparecerán aquí.', `<button class="btn btn--accent" data-go="explorar">Explorar prendas</button>`)}`;
      const pct = Math.min(100, (t.subtotal / t.freeFrom) * 100);
      return `${head('Carrito', `${SF.cart.count()} ${SF.cart.count() === 1 ? 'artículo' : 'artículos'}`)}
        <div class="cart-layout">
          <div class="panel">
            <div class="free-ship"><p>${t.missingForFree ? `Te faltan <strong>${SF.money(t.missingForFree)}</strong> para envío gratis` : '¡Tienes <strong>envío gratis</strong>!'}</p><div class="bar"><span style="width:${pct}%"></span></div></div>
            ${lines.map(l => `
            <div class="cart-line">
              <a href="producto.html?id=${l.productId}" class="cart-line__img"><img src="${l.product.images[0]}" alt="${esc(l.product.name)}"></a>
              <div class="cart-line__info">
                <a href="producto.html?id=${l.productId}" class="cart-line__name">${esc(l.product.name)}</a>
                <span class="muted">Talla ${esc(l.size)} · ${esc(l.product.colors?.[0]?.name || '')}</span>
                <div class="qty" data-line="${l.productId}|${l.size}"><button data-q="-1" aria-label="Menos">−</button><span>${l.qty}</span><button data-q="1" aria-label="Más">+</button></div>
              </div>
              <div class="cart-line__end"><strong>${SF.money(l.lineTotal)}</strong><button class="link-btn" data-rm="${l.productId}|${l.size}">Quitar</button></div>
            </div>`).join('')}
          </div>
          <aside class="panel summary">
            <h2>Resumen</h2>
            <div class="sum-row"><span>Subtotal</span><span>${SF.money(t.subtotal)}</span></div>
            ${t.discount ? `<div class="sum-row sum-row--loyal"><span>${SF.isoSVG} Tarjeta SF Club · 60%</span><span>−${SF.money(t.discount)}</span></div>` : ''}
            <div class="sum-row muted"><span>Envío</span><span>${t.shipping ? SF.money(t.shipping) : 'Gratis'}</span></div>
            <div class="sum-row sum-row--total"><span>Total</span><span>${SF.money(t.total)}</span></div>
            <a class="btn btn--accent btn--block" href="checkout.html">Continuar al pago ${icon.arrow}</a>
            <button class="btn btn--ghost btn--block" data-go="explorar">Seguir explorando</button>
            <button class="pay-strip" data-go="pagos">${icon.card}${icon.bank}${icon.phone}${icon.cash}<span>Ver medios de pago</span></button>
          </aside>
        </div>`;
    },

    pagos() {
      const pend = SF.orders.mine().filter(o => o.status === 'pending_payment');
      const methods = [
        { ic: 'card', t: 'Tarjeta de crédito o débito', d: 'Visa, Mastercard y American Express.' },
        { ic: 'bank', t: 'Transferencia / PSE', d: 'Débito directo desde tu cuenta bancaria.' },
        { ic: 'phone', t: 'Billeteras digitales', d: 'Paga desde la app de tu billetera.' },
        { ic: 'cash', t: 'Pago contra entrega', d: 'Pagas al recibir (según ciudad).' },
      ];
      return `${head('Medios de pago', 'Cómo puedes pagar tus pedidos')}
        <div class="pay-layout">
          ${SF.loyaltyCard.html()}
          <div class="methods">
            ${methods.map(m => `<div class="method"><span class="method__ic">${icon[m.ic]}</span><div><b>${m.t}</b><small>${m.d}</small></div><span class="status">Próximamente</span></div>`).join('')}
          </div>
        </div>
        <div class="notice mt-2">Los pagos en línea se activarán muy pronto. Por ahora tu pedido queda <strong>reservado</strong> y te contactamos para completar el pago.</div>
        ${pend.length ? `<section class="sec sec--tight"><div class="sec__head"><h2 class="sec__title">Pendientes de pago</h2></div>
          <div class="panel">${pend.map(o => `<div class="order"><div><strong>${esc(o.number)}</strong> <span class="muted">· ${new Date(o.createdAt).toLocaleDateString('es')}</span><br><span class="muted">${o.items.map(i => `${esc(i.name)} (${esc(i.size)}) x${i.qty}`).join(', ')}</span></div><div style="text-align:right"><strong>${SF.money(o.total)}</strong><br><span class="status">Pendiente</span></div></div>`).join('')}</div></section>` : ''}
        <section class="sec sec--tight">
          <div class="sec__head"><h2 class="sec__title">Compra <span class="serif">segura</span></h2></div>
          <div class="trust">
            <div>${icon.shield}<b>Pasarela certificada</b><small>Los pagos los procesará un proveedor especializado.</small></div>
            <div>${icon.card}<b>Sin guardar tarjetas</b><small>SF Urban no almacena los datos de tu tarjeta.</small></div>
            <div>${icon.truck}<b>Envío con seguimiento</b><small>Te avisamos en cada paso de tu pedido.</small></div>
          </div>
        </section>`;
    },

    perfil() {
      const u = SF.auth.user();
      if (!u) return `
        ${head('Perfil')}
        <div class="welcome panel">
          <div class="avatar-xl">${SF.isoSVG}</div>
          <h2 class="display h-s">Únete al <span class="serif">club</span></h2>
          <p class="muted">Guarda favoritos, sigue tus pedidos y entérate primero de cada drop.</p>
          <div class="welcome__cta"><button class="btn btn--accent" data-auth="register">Crear cuenta</button><button class="btn btn--ghost" data-auth="login">Iniciar sesión</button></div>
          <ul class="perks-list"><li>${icon.box} Seguimiento de pedidos</li><li>${icon.heart} Favoritos en todos tus dispositivos*</li><li>${icon.truck} Direcciones guardadas</li></ul>
          <small class="muted">*Cuando conectemos la base de datos.</small>
        </div>`;
      const tab = ex.ptab || 'pedidos';
      const orders = SF.orders.mine(), a = u.address || {};
      const initials = ((u.name || u.email || '?').trim().split(/\s+/).map(s => s[0]).slice(0, 2).join('') || '?').toUpperCase();
      const statusTxt = { pending_payment: 'Pendiente de pago', paid: 'Pagado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };
      const panes = {
        pedidos: orders.length ? `<div class="panel">${orders.map(o => `<div class="order"><div><strong>${esc(o.number)}</strong> <span class="muted">· ${new Date(o.createdAt).toLocaleDateString('es')}</span><br><span class="muted">${o.items.map(i => `${esc(i.name)} (${esc(i.size)}) x${i.qty}`).join(', ')}</span></div><div style="text-align:right"><strong>${SF.money(o.total)}</strong><br><span class="status">${statusTxt[o.status] || o.status}</span></div></div>`).join('')}</div>`
          : empty('box', 'Sin pedidos todavía', 'Cuando compres, verás aquí el estado de cada pedido.', `<button class="btn btn--ghost" data-go="explorar">Explorar</button>`),
        datos: `<div class="panel"><form class="form" data-profile>
            <label>Nombre<input name="name" value="${esc(u.name)}" required></label>
            <div class="form-row"><label>Correo<input value="${esc(u.email)}" disabled></label><label>Celular / WhatsApp <span class="muted">(opcional: entregas y avisos si los autorizas)</span><input name="phone" type="tel" inputmode="tel" value="${esc(u.phone || '')}"></label></div>
            <button class="btn btn--accent" style="justify-self:start">Guardar cambios</button></form></div>`,
        privacidad: (() => {
          const hist = SF.consent.history(u.email);
          const label = { terminos: 'Términos y condiciones', privacidad: 'Tratamiento de datos (Privacidad)', marketing: 'Publicidad por correo', mayoria_edad: 'Mayor de 18 años', cookies_analitica: 'Cookies de analítica' };
          const where = { registro: 'Registro', checkout: 'Compra', 'banner-cookies': 'Aviso de cookies', perfil: 'Perfil' };
          return `
          <div class="panel privacy-pane">
            <h2>Tus autorizaciones</h2>
            <label class="set-row"><span><b>Publicidad por correo</b><small>Novedades, lanzamientos y descuentos. Puedes retirarla cuando quieras.</small></span><input type="checkbox" class="switch" data-marketing ${u.marketing ? 'checked' : ''}></label>
            <label class="set-row"><span><b>Avisos por WhatsApp</b><small>Descuentos de Black Friday, lanzamientos y promociones${u.phone ? ` al ${esc(u.phone)}` : ''}. Tú decides: sí o no, y puedes cambiarlo cuando quieras.</small></span><input type="checkbox" class="switch" data-whatsapp ${u.whatsapp ? 'checked' : ''}></label>
            <label class="set-row"><span><b>Cookies de analítica</b><small>Nos ayuda a saber qué prendas interesan más.</small></span><input type="checkbox" class="switch" data-analytics ${SF.consent.cookies.analytics() ? 'checked' : ''}></label>
            <h2 class="mt-2">Registro de consentimientos</h2>
            <p class="legal-note">Cada vez que aceptas o retiras una autorización queda registrada con fecha, hora y versión del documento.</p>
            ${hist.length ? `<div class="consent-table" role="table">${hist.map(h => `
              <div class="consent-row" role="row"><span>${new Date(h.at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span><span><b>${esc(label[h.purpose] || h.purpose)}</b><small>${esc(h.docVersion)} · ${esc(where[h.form] || h.form)}</small></span><span class="status ${h.granted ? 'status--ok' : ''}">${h.granted ? 'Aceptó' : 'No / retiró'}</span></div>`).join('')}</div>`
              : '<p class="muted">Aún no hay registros en este dispositivo.</p>'}
            <h2 class="mt-2">Tus derechos</h2>
            <p class="legal-note">Puedes conocer, actualizar, rectificar y suprimir tus datos, o revocar tu autorización (Ley 1581 de 2012). <a href="${SF.config.legal.docs.privacidad}#derechos">Cómo ejercerlos</a></p>
            <div class="privacy-actions">
              <button class="btn btn--ghost btn--sm" data-export>Descargar mis datos</button>
              <a class="btn btn--ghost btn--sm" href="mailto:${esc(SF.config.brand.email)}?subject=${encodeURIComponent('Solicitud de datos personales - SF Urban')}">Escribir una solicitud</a>
              <button class="btn btn--ghost btn--sm btn--danger" data-delete-account>Eliminar mi cuenta</button>
            </div>
          </div>`;
        })(),
        direccion: `<div class="panel"><form class="form" data-address>
            <label>Dirección<input name="line1" value="${esc(a.line1 || '')}" autocomplete="address-line1"></label>
            <label>Apartamento, barrio, referencias<input name="line2" value="${esc(a.line2 || '')}" autocomplete="address-line2"></label>
            <div class="form-row"><label>Ciudad<input name="city" value="${esc(a.city || '')}" autocomplete="address-level2"></label><label>Departamento / Estado<input name="region" value="${esc(a.region || '')}" autocomplete="address-level1"></label></div>
            <button class="btn btn--accent" style="justify-self:start">Guardar dirección</button></form></div>`,
      };
      return `
        <div class="me">
          <label class="me__av ${u.avatar ? 'has-photo' : ''}" title="Cambiar foto de perfil">
            ${u.avatar ? `<img src="${esc(u.avatar)}" alt="Tu foto de perfil">` : esc(initials)}
            <span class="me__av-edit" aria-hidden="true">${icon.camera || '✎'}</span>
            <input type="file" accept="image/*" data-avatar hidden>
            <span class="sr-only">Cambiar foto de perfil</span>
          </label>
          ${u.avatar ? '<button class="link-btn me__av-rm" data-avatar-rm>Quitar foto</button>' : ''}
          <div class="me__txt"><h1 class="display h-s">${esc(u.name)}</h1><p class="muted">${esc(u.email)} · Miembro desde ${new Date(u.createdAt).toLocaleDateString('es', { month: 'long', year: 'numeric' })}</p></div>
          <button class="btn btn--ghost btn--sm" data-logout>${icon.logout} Salir</button>
        </div>
        <div class="me__stats"><div><b>${orders.length}</b><span>Pedidos</span></div><div><b>${SF.wish.list().length}</b><span>Favoritos</span></div><div><b>${SF.cart.count()}</b><span>En carrito</span></div></div>
        <div class="seg" role="tablist">${[['pedidos', 'Pedidos'], ['datos', 'Mis datos'], ['direccion', 'Dirección'], ['privacidad', 'Privacidad']].map(([k, l]) => `<button role="tab" class="${tab === k ? 'is-on' : ''}" data-ptab="${k}">${l}</button>`).join('')}</div>
        ${panes[tab]}`;
    },
  };

  /* ---------------- Resultados de Explorar (sin re-pintar el buscador) ---------------- */
  function renderResults() {
    const box = $('[data-ex-results]'); if (!box) return;
    const q = ex.q.trim().toLowerCase();
    let a = active().filter(p =>
      (ex.cat === 'all' || p.category === ex.cat) &&
      (ex.size === 'all' || (p.stock?.[ex.size] > 0)) &&
      (!q || [p.name, p.category, p.drop, p.description, ...(p.colors || []).map(c => c.name)].join(' ').toLowerCase().includes(q)));
    if (ex.sort === 'price-asc') a.sort((x, y) => x.price - y.price);
    if (ex.sort === 'price-desc') a.sort((x, y) => y.price - x.price);
    const s = ex.soon && !q && ex.size === 'all' ? soon().filter(p => ex.cat === 'all' || p.category === ex.cat) : [];
    box.innerHTML = a.length || s.length ? [...a, ...s].map(card).join('')
      : `<div class="empty" style="grid-column:1/-1"><div class="empty__icon">${icon.search}</div><h3>Sin resultados</h3><p>${q ? `No encontramos “${esc(ex.q)}”… todavía.` : 'Prueba con otros filtros.'}</p></div>`;
    const sel = $('[data-ex-sort]'); if (sel) sel.value = ex.sort;
  }

  /* ---------------- Router ---------------- */
  const alias = { tienda: 'explorar', drop: 'inicio', nosotros: 'inicio', club: 'perfil', guardados: 'favoritos', cuenta: 'perfil', pedidos: 'perfil' };
  const current = () => { const h = (location.hash || '#inicio').slice(1); return views[h] ? h : (alias[h] || 'inicio'); };
  let shown = null;
  function render(force) {
    const id = current();
    if (id !== shown) scrollTo({ top: 0, behavior: 'instant' });
    view.innerHTML = `<div class="view view--${id}">${views[id]()}</div>`;
    shown = id; SF.setDock(id);
    document.title = (id === 'inicio' ? 'SF Urban — Women & Men Activewear' : `${SF.views.find(v => v.id === id).label} — SF Urban`);
    if (id === 'explorar') renderResults();
    const ins = $('[data-inside]', view);
    if (ins) {
      new IntersectionObserver(([en], io) => { if (en.isIntersecting) { ins.classList.add('is-in'); io.disconnect(); } }, { threshold: .2 }).observe(ins);
      const hi = (i) => $$('[data-f]', ins).forEach(el => el.classList.toggle('is-active', el.dataset.f === String(i)));
      ins.addEventListener('mouseover', (e) => { const t = e.target.closest('[data-f]'); hi(t ? t.dataset.f : -1); });
      ins.addEventListener('mouseleave', () => hi(-1));
    }
    SF.reveal(view);
    if (!force) SF.track('view', { view: id });
  }
  addEventListener('hashchange', () => render());

  /* ---------------- Logo del inicio: se inclina siguiendo el cursor ---------------- */
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
  let tiltRaf = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || reduced()) return;
    const fig = $('[data-logo3d]', view); if (!fig) return;
    cancelAnimationFrame(tiltRaf);
    tiltRaf = requestAnimationFrame(() => {
      const r = fig.getBoundingClientRect();
      const x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
      const y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)));
      fig.style.setProperty('--ry', (x * 18).toFixed(2) + 'deg');
      fig.style.setProperty('--rx', (-y * 14).toFixed(2) + 'deg');
    });
  }, { passive: true });

  // "Ver catálogo": baja suave al catálogo (sin cambiar de vista)
  view.addEventListener('click', (e) => {
    if (!e.target.closest('[data-to-catalog]')) return;
    e.preventDefault();
    $('#catalogo', view)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'start' });
  });

  /* ---------------- Interacciones ---------------- */
  view.addEventListener('click', (e) => {
    const t = e.target.closest('[data-go],[data-cat-go],[data-ex-cat],[data-ex-size],[data-notify],[data-auth],[data-ptab],[data-export],[data-delete-account]');
    if (!t) return;
    if (t.matches('[data-export]')) {
      const data = SF.auth.exportData(); if (!data) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      a.download = `mis-datos-sfurban-${new Date().toISOString().slice(0, 10)}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    if (t.matches('[data-delete-account]')) {
      if (!confirm('¿Eliminar tu cuenta? Se borran tus datos, pedidos y favoritos de este dispositivo y retiras tu autorización. No se puede deshacer.')) return;
      SF.auth.deleteAccount().then(() => { SF.toast('Tu cuenta fue eliminada'); SF.goView('inicio'); });
      return;
    }
    if (t.matches('[data-go]')) SF.goView(t.dataset.go);
    else if (t.matches('[data-cat-go]')) { ex.cat = t.dataset.catGo; SF.goView('explorar'); }
    else if (t.matches('[data-ex-cat]')) { ex.cat = t.dataset.exCat; $$('[data-ex-cat]').forEach(b => b.classList.toggle('is-on', b === t)); renderResults(); SF.track('filter', { category: ex.cat }); }
    else if (t.matches('[data-ex-size]')) { ex.size = t.dataset.exSize; $$('[data-ex-size]').forEach(b => b.classList.toggle('is-on', b === t)); renderResults(); }
    else if (t.matches('[data-auth]')) SF.openAuth(t.dataset.auth);
    else if (t.matches('[data-ptab]')) { ex.ptab = t.dataset.ptab; render(true); }
    else if (t.matches('[data-notify]')) {
      const u = SF.auth.user();
      if (!u) { SF.openAuth('register'); SF.toast('Crea tu cuenta y te avisamos cuando llegue', 'info'); return; }
      if (!SF.db.where('notify', x => x.userId === u.id && x.productId === t.dataset.notify).length) SF.db.insert('notify', { userId: u.id, productId: t.dataset.notify });
      t.textContent = '✓ Te avisaremos'; t.disabled = true; SF.track('notify_me', { productId: t.dataset.notify });
    }
  });
  let qTimer;
  view.addEventListener('input', (e) => {
    if (e.target.matches('[data-ex-q]')) { ex.q = e.target.value; renderResults(); clearTimeout(qTimer); qTimer = setTimeout(() => ex.q && SF.track('search', { q: ex.q }), 800); }
  });
  view.addEventListener('change', (e) => {
    if (e.target.matches('[data-ex-sort]')) { ex.sort = e.target.value; renderResults(); }
    if (e.target.matches('[data-ex-soon]')) { ex.soon = e.target.checked; renderResults(); }
    if (e.target.matches('[data-marketing]')) SF.auth.setMarketing(e.target.checked).then(() => SF.toast(e.target.checked ? 'Autorizaste recibir novedades' : 'Ya no te enviaremos publicidad', 'info'));
    if (e.target.matches('[data-whatsapp]')) {
      const on = e.target.checked, u = SF.auth.user();
      if (on && !SF.auth.cleanPhone(u.phone)) {
        e.target.checked = false; ex.ptab = 'datos'; render(true);
        SF.toast('Primero escribe tu número de WhatsApp en "Celular" y guarda; luego activa los avisos.', 'info');
        setTimeout(() => $('[data-profile] [name="phone"]')?.focus(), 100);
        return;
      }
      SF.auth.setWhatsapp(on, u.phone).then(() => SF.toast(on ? 'Listo: te avisaremos por WhatsApp' : 'Ya no te enviaremos avisos por WhatsApp', 'info'))
        .catch(ex => { e.target.checked = !on; SF.toast(ex.message, 'err'); });
    }
    if (e.target.matches('[data-avatar]') && e.target.files[0]) {
      SF.toast('Subiendo tu foto…', 'info');
      SF.auth.uploadAvatar(e.target.files[0]).then(() => SF.toast('Foto de perfil actualizada ✓')).catch(ex => SF.toast(ex.message, 'err'));
    }
    if (e.target.matches('[data-analytics]')) SF.consent.cookies.set(e.target.checked, 'interruptor en el perfil').then(() => { SF.toast('Preferencia de cookies actualizada', 'info'); render(true); });
  });
  view.addEventListener('submit', (e) => {
    const f = e.target; e.preventDefault();
    if (f.matches('[data-profile]')) { SF.auth.updateProfile({ name: f.name.value.trim() || SF.auth.user().name, phone: f.phone.value }); SF.toast('Datos guardados ✓'); }
    if (f.matches('[data-address]')) { SF.auth.updateProfile({ address: { line1: f.line1.value, line2: f.line2.value, city: f.city.value, region: f.region.value } }); SF.toast('Dirección guardada ✓'); }
  });

  // Mantener las vistas al día cuando cambian carrito, favoritos o sesión
  SF.cart.onChange(() => { if (['carrito', 'favoritos', 'perfil'].includes(shown)) render(true); else $$('[data-wish]', view).forEach(b => b.classList.toggle('is-on', SF.wish.has(b.dataset.wish))); });
  SF.auth.onChange(() => { if (['perfil', 'pagos', 'inicio'].includes(shown)) render(true); });
  view.addEventListener('click', (e) => {
    if (!e.target.closest('[data-avatar-rm]')) return;
    SF.auth.removeAvatar().then(() => SF.toast('Foto quitada')).catch(ex => SF.toast(ex.message, 'err'));
  });
  // El inventario cambió en la base de datos (desde el panel privado) → se vuelve a pintar
  addEventListener('sf:catalog', () => {
    const q = $('[data-ex-q]'), had = q && document.activeElement === q;
    if (shown === 'explorar' && $('[data-ex-results]')) renderResults(); else render(true);
    if (had) q.focus();
  });

  render();
})();
