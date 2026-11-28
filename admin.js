/* =========================================================
   SF Urban — Panel privado (admin.html)
   Inventario · Pedidos · Consentimientos, directo sobre Supabase.
   Sin librerías: usa la API REST de Supabase (auth, base de datos y fotos).
   La seguridad real la ponen las reglas RLS de db/supabase-instalar.sql:
   aunque alguien encuentre esta página, sin un usuario de la tabla
   "admins" no puede leer ni cambiar nada.
   ========================================================= */
(function () {
  const cfg = SF.config.supabase || {};
  const app = document.getElementById('app');
  const LOGO = 'isotipo.svg';
  const SESSION = 'sf-admin-session';

  /* ---------------- Utilidades ---------------- */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
  const date = (d) => new Date(d).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
  const slugify = (s) => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  let toastT;
  function toast(msg, err) {
    const t = $('[data-toast]'); t.textContent = msg; t.classList.toggle('is-err', !!err); t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, err ? 6000 : 2600);
  }
  const STATUS = { active: 'Publicada', coming_soon: 'Próximamente', draft: 'Borrador (oculta)', archived: 'Archivada (oculta)' };
  const ORDER_STATUS = { pending_payment: 'Pendiente de pago', paid: 'Pagado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado', refunded: 'Reembolsado' };

  /* ---------------- Sesión (Supabase Auth) ---------------- */
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SESSION)); } catch {}
  const saveSession = (s) => { session = s; try { s ? localStorage.setItem(SESSION, JSON.stringify(s)) : localStorage.removeItem(SESSION); } catch {} };

  async function authCall(grant, body) {
    const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST', headers: { apikey: cfg.anonKey, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error_description || j.msg || j.message || 'No se pudo iniciar sesión');
    saveSession({ access_token: j.access_token, refresh_token: j.refresh_token, expires_at: Date.now() + (j.expires_in - 60) * 1000, email: j.user?.email });
  }
  const login = (email, password) => authCall('password', { email, password });
  async function token() {
    if (!session) throw new Error('Sin sesión');
    if (Date.now() > session.expires_at) {
      try { await authCall('refresh_token', { refresh_token: session.refresh_token }); }
      catch { saveSession(null); showLogin('Tu sesión expiró. Vuelve a entrar.'); throw new Error('Sesión expirada'); }
    }
    return session.access_token;
  }
  async function logout() {
    try { await fetch(`${cfg.url}/auth/v1/logout`, { method: 'POST', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${session?.access_token}` } }); } catch {}
    saveSession(null); showLogin();
  }

  /* ---------------- Base de datos (REST) ---------------- */
  async function api(path, { method = 'GET', body, prefer } = {}) {
    const r = await fetch(`${cfg.url}/rest/v1/${path}`, {
      method,
      headers: { apikey: cfg.anonKey, Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json', ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      if (j.code === '23505') throw new Error('Ya existe una prenda con ese enlace (slug). Cambia el nombre o el enlace.');
      if (r.status === 401 || r.status === 403 || j.code === '42501') throw new Error('Tu usuario no tiene permiso para esto.');
      throw new Error(j.message || `Error ${r.status}`);
    }
    return r.status === 204 ? null : r.json();
  }

  /* ---------------- Fotos (Supabase Storage) ---------------- */
  // Reduce la foto antes de subirla (máx. 1600 px, WebP): carga más rápido y gasta menos espacio.
  async function shrink(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
    try {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      const blob = await new Promise(res => c.toBlob(res, 'image/webp', 0.86));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }
  async function uploadImage(file, productKey) {
    const data = await shrink(file);
    const ext = data.type === 'image/webp' ? 'webp' : (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `${productKey}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const r = await fetch(`${cfg.url}/storage/v1/object/productos/${path}`, {
      method: 'POST', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${await token()}`, 'Content-Type': data.type || 'application/octet-stream' }, body: data,
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error('No se pudo subir la foto: ' + (j.message || r.status)); }
    return `${cfg.url}/storage/v1/object/public/productos/${path}`;
  }

  /* ---------------- Pantalla de ingreso ---------------- */
  function showLogin(msg = '') {
    app.innerHTML = `
    <section class="login">
      <form class="login__box" data-login>
        <div class="login__brand"><img src="${LOGO}" alt=""><h1>Panel <span class="serif">SF Urban</span></h1></div>
        <p class="muted small">Solo para el equipo de la tienda.</p>
        <label class="field"><span>Correo</span><input class="input" name="email" type="email" autocomplete="username" required></label>
        <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
        <p class="err" data-err>${esc(msg)}</p>
        <button class="btn btn--accent" type="submit">Entrar</button>
      </form>
    </section>`;
    $('[data-login]').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, b = $('button', f), err = $('[data-err]');
      b.disabled = true; b.innerHTML = '<span class="spin"></span>'; err.textContent = '';
      try { await login(f.email.value.trim().toLowerCase(), f.password.value); await start(); }
      catch (ex) { err.textContent = /invalid/i.test(ex.message) ? 'Correo o contraseña incorrectos.' : ex.message; b.disabled = false; b.textContent = 'Entrar'; }
    });
  }

  /* ---------------- Estado del panel ---------------- */
  const st = { tab: 'inventario', products: [], categories: [], orders: [], consents: [], q: '' };

  async function start() {
    if (!cfg.url || !cfg.anonKey) {
      app.innerHTML = `<section class="login"><div class="login__box"><h1>Falta conectar</h1><p class="muted">Pon la URL y la anon key de Supabase en <code>config.js → supabase</code>.</p></div></section>`;
      return;
    }
    if (!session) return showLogin();
    try {
      const me = await api('admins?select=email');
      if (!me.length) { saveSession(null); return showLogin('Este usuario no está autorizado como administrador.'); }
    } catch (ex) { if (ex.message !== 'Sesión expirada') { saveSession(null); showLogin(ex.message); } return; }
    shell();
    await load();
  }

  function shell() {
    app.innerHTML = `
    <header class="top">
      <div class="top__brand"><img src="${LOGO}" alt=""><h1>Panel <span class="serif">SF Urban</span></h1></div>
      <div class="top__end">
        <a class="btn btn--sm btn--ghost" href="index.html" target="_blank" rel="noopener">Ver tienda</a>
        <button class="btn btn--sm btn--ghost" data-logout>Salir</button>
      </div>
    </header>
    <nav class="tabs" role="tablist">
      ${[['inventario', 'Inventario'], ['pedidos', 'Pedidos'], ['consentimientos', 'Consentimientos']].map(([k, l]) => `<button role="tab" data-tab="${k}" class="${st.tab === k ? 'is-on' : ''}">${l}</button>`).join('')}
    </nav>
    <div class="wrap" data-view><p class="muted"><span class="spin"></span> Cargando…</p></div>`;
    $('[data-logout]').onclick = logout;
    $$('[data-tab]').forEach(b => b.onclick = () => { st.tab = b.dataset.tab; st.q = ''; $$('[data-tab]').forEach(x => x.classList.toggle('is-on', x === b)); load(); });
  }

  async function load() {
    const v = $('[data-view]');
    try {
      if (st.tab === 'inventario') {
        [st.products, st.categories] = await Promise.all([
          api('products?select=*&order=sort.asc,created_at.asc'),
          api('categories?select=*&order=sort.asc'),
        ]);
      } else if (st.tab === 'pedidos') st.orders = await api('orders?select=*&order=created_at.desc&limit=300');
      else st.consents = await api('consent_records?select=*&order=server_ts.desc&limit=500');
      render();
    } catch (ex) { if (v) v.innerHTML = `<div class="empty">${esc(ex.message)}</div>`; }
  }

  function render() {
    const v = $('[data-view]'); if (!v) return;
    if (st.tab === 'inventario') v.innerHTML = inventory();
    else if (st.tab === 'pedidos') v.innerHTML = orders();
    else v.innerHTML = consents();
  }

  /* ---------------- Inventario ---------------- */
  const stockTotal = (p) => Object.values(p.stock || {}).reduce((a, n) => a + (+n || 0), 0);
  function inventory() {
    const q = st.q.toLowerCase();
    const list = st.products.filter(p => !q || [p.name, p.category, p.drop_name, p.status].join(' ').toLowerCase().includes(q));
    return `
    <div class="bar">
      <input class="input" type="search" placeholder="Buscar prenda…" value="${esc(st.q)}" data-q>
      <button class="btn btn--accent" data-new>+ Nueva prenda</button>
    </div>
    <p class="muted small" style="margin:0 0 12px">${st.products.filter(p => p.status === 'active').length} publicadas · ${st.products.length} en total. Los cambios se ven en la tienda al recargarla.</p>
    <div class="plist">
      ${list.map(p => {
        const n = stockTotal(p);
        const sizes = (p.sizes || []).map(s => { const k = +(p.stock?.[s] || 0); return `<span class="${k === 0 ? 'out' : k <= 3 ? 'low' : ''}">${esc(s)}: ${k}</span>`; }).join(' ');
        return `<article class="prow">
          <div class="prow__img" style="${p.images?.[0] ? `background-image:url('${esc(p.images[0])}')` : ''}">${p.images?.[0] ? '' : 'Sin foto'}</div>
          <div>
            <div class="prow__name">${esc(p.name)}</div>
            <div class="prow__meta">
              <span class="chip chip--${p.status}">${STATUS[p.status]}</span>
              ${p.featured ? '<span class="chip chip--star">Destacada</span>' : ''}
              <span>${money(p.price)}</span>
              ${p.status === 'active' ? `<span>${n} uds · ${sizes || 'sin tallas'}</span>` : ''}
            </div>
          </div>
          <button class="btn btn--sm" data-edit="${esc(p.id)}">Editar</button>
        </article>`;
      }).join('') || '<div class="empty">No hay prendas que coincidan.</div>'}
    </div>`;
  }

  app.addEventListener('input', (e) => {
    if (e.target.matches('[data-q]')) { st.q = e.target.value; const pos = e.target.selectionStart; render(); const i = $('[data-q]'); i.focus(); i.setSelectionRange(pos, pos); }
  });
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-new],[data-edit]'); if (!t) return;
    openEditor(t.matches('[data-new]') ? null : st.products.find(p => p.id === t.dataset.edit));
  });

  /* ---------------- Editor de prenda ---------------- */
  function openEditor(orig) {
    const isNew = !orig;
    // Copia de trabajo (no toca la lista hasta guardar)
    const d = JSON.parse(JSON.stringify(orig || {
      name: '', slug: '', status: 'draft', featured: false, category: st.categories[0]?.id || null, drop_name: '', gender: 'unisex',
      price: null, compare_at: null, description: '', badges: [], colors: [{ name: '', hex: '#0D0D0F' }],
      sizes: ['S', 'M', 'L', 'XL'], stock: { S: 0, M: 0, L: 0, XL: 0 }, images: [], features: [],
    }));
    if (!d.colors?.length) d.colors = [{ name: '', hex: '#0D0D0F' }];
    const uploadKey = d.id || 'nuevo-' + Date.now().toString(36);
    let slugTouched = !isNew, selFeat = -1, busy = false;

    const el = document.createElement('div');
    el.className = 'sheet';
    document.body.appendChild(el);
    document.body.style.overflow = 'hidden';
    const close = () => { el.remove(); document.body.style.overflow = ''; };

    const stockRows = () => d.sizes.map((s, i) => `
      <div class="row row--stock">
        <input class="input" value="${esc(s)}" data-size="${i}" aria-label="Talla" placeholder="Talla">
        <input class="input" type="number" min="0" inputmode="numeric" value="${+(d.stock[s] || 0)}" data-qty="${i}" aria-label="Unidades">
        <button type="button" class="x" data-rm-size="${i}" aria-label="Quitar talla">×</button>
      </div>`).join('');
    const colorRows = () => d.colors.map((c, i) => `
      <div class="row row--color">
        <input class="input" value="${esc(c.name)}" data-cname="${i}" placeholder="Ej. Burdeos / Negro">
        <input class="input" type="color" value="${esc(c.hex || '#0D0D0F')}" data-chex="${i}" aria-label="Color">
        <button type="button" class="x" data-rm-color="${i}" aria-label="Quitar color" ${d.colors.length < 2 ? 'disabled' : ''}>×</button>
      </div>`).join('');
    const imgs = () => `${d.images.map((u, i) => `
      <div class="img" style="background-image:url('${esc(u)}')">
        ${i === 0 ? '<span class="img__first">Principal</span>' : ''}
        <div class="img__tools">
          <button type="button" data-img-first="${i}" title="Usar como principal" ${i === 0 ? 'disabled' : ''}>★</button>
          <button type="button" data-img-rm="${i}" title="Quitar foto">×</button>
        </div>
      </div>`).join('')}
      <label class="upload"><input type="file" accept="image/*" multiple data-upload><span data-up-lbl>+ Subir fotos</span></label>`;
    const feats = () => `${d.features.map((f, i) => `
      <div class="row row--feat ${i === selFeat ? 'is-sel' : ''}" data-feat-row="${i}">
        <div class="feat-fields">
          <input class="input" value="${esc(f.title)}" data-ftitle="${i}" placeholder="Título (ej. Capucha ajustable)">
          <input class="input" value="${esc(f.text)}" data-ftext="${i}" placeholder="Descripción corta">
          <button type="button" class="btn btn--sm btn--ghost" data-fsel="${i}">${i === selFeat ? 'Toca la foto para ubicarlo' : `Ubicar en la foto (${Math.round(f.x)}%, ${Math.round(f.y)}%)`}</button>
        </div>
        <button type="button" class="x" data-rm-feat="${i}" aria-label="Quitar punto">×</button>
      </div>`).join('')}`;
    const pick = () => d.images[0] ? `<div class="pick" data-pick style="background-image:url('${esc(d.images[0])}')">${d.features.map((f, i) => `<span class="pick__dot ${i === selFeat ? 'is-sel' : ''}" style="left:${f.x}%;top:${f.y}%">${i + 1}</span>`).join('')}</div>` : '<p class="muted small">Sube una foto para ubicar los puntos.</p>';

    el.innerHTML = `
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-label="${isNew ? 'Nueva prenda' : 'Editar prenda'}">
      <div class="sheet__head"><h2>${isNew ? 'Nueva prenda' : esc(d.name)}</h2><button class="btn btn--sm btn--ghost" data-close>Cerrar</button></div>
      <form class="sheet__body" data-form novalidate>
        <section class="group">
          <h3>Lo básico</h3>
          <label class="field"><span>Nombre</span><input class="input" name="name" value="${esc(d.name)}" required placeholder="Ej. Conjunto Track Burdeos"></label>
          <label class="field"><span>Enlace (se crea solo)</span><input class="input" name="slug" value="${esc(d.slug)}" placeholder="conjunto-track-burdeos"></label>
          <div class="grid2">
            <label class="field"><span>Estado en la tienda</span><select class="select" name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${d.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
            <label class="field"><span>Categoría</span><select class="select" name="category">${st.categories.map(c => `<option value="${esc(c.id)}" ${d.category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
            <label class="field"><span>Precio (COP)</span><input class="input" name="price" type="number" min="0" step="100" inputmode="numeric" value="${d.price ?? ''}" placeholder="189900"></label>
            <label class="field"><span>Precio anterior (opcional, sale tachado)</span><input class="input" name="compare_at" type="number" min="0" step="100" inputmode="numeric" value="${d.compare_at ?? ''}"></label>
            <label class="field"><span>Drop / colección</span><input class="input" name="drop_name" value="${esc(d.drop_name)}" placeholder="Drop 01"></label>
            <label class="field"><span>Para</span><select class="select" name="gender">${[['unisex', 'Unisex'], ['mujer', 'Mujer'], ['hombre', 'Hombre']].map(([k, l]) => `<option value="${k}" ${d.gender === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          </div>
          <label class="field"><span>Descripción</span><textarea class="textarea" name="description" placeholder="Tela, corte, cómo queda…">${esc(d.description)}</textarea></label>
          <label class="field"><span>Etiquetas (separadas por coma)</span><input class="input" name="badges" value="${esc((d.badges || []).join(', '))}" placeholder="Nuevo, Edición limitada"></label>
          <label class="check"><input type="checkbox" name="featured" ${d.featured ? 'checked' : ''}> Prenda destacada (sale primera en el catálogo del inicio)</label>
        </section>

        <section class="group">
          <h3>Fotos</h3>
          <p class="muted small" style="margin:0">La primera es la principal. Se reducen solas para que la tienda cargue rápido.</p>
          <div class="imgs" data-imgs>${imgs()}</div>
        </section>

        <section class="group">
          <h3>Tallas e inventario</h3>
          <div class="rows" data-stock>${stockRows()}</div>
          <button type="button" class="btn btn--sm btn--ghost" data-add-size>+ Agregar talla</button>
        </section>

        <section class="group">
          <h3>Color</h3>
          <div class="rows" data-colors>${colorRows()}</div>
          <button type="button" class="btn btn--sm btn--ghost" data-add-color>+ Agregar color</button>
        </section>

        <section class="group">
          <h3>Qué hay dentro <span class="muted small">(opcional)</span></h3>
          <p class="muted small" style="margin:0">Detalles que se ven en la página de la prenda (sección "Detalles"). Ideal: 6.</p>
          <div data-pick-wrap>${pick()}</div>
          <div class="rows" data-feats>${feats()}</div>
          <button type="button" class="btn btn--sm btn--ghost" data-add-feat>+ Agregar punto</button>
        </section>
      </form>
      <div class="sheet__foot">
        ${isNew ? '<span></span>' : '<button class="btn btn--danger" data-del>Eliminar</button>'}
        <button class="btn btn--accent" data-save>${isNew ? 'Crear prenda' : 'Guardar cambios'}</button>
      </div>
    </div>`;

    const form = $('[data-form]', el);
    const redraw = (sel, html) => { $(sel, el).innerHTML = html; };

    // Pasar lo escrito en el formulario a la copia de trabajo
    function collect() {
      const f = form;
      d.name = f.name.value.trim();
      d.slug = slugify(f.slug.value || d.name);
      d.status = f.status.value; d.category = f.category.value || null;
      d.price = f.price.value === '' ? null : Math.round(+f.price.value);
      d.compare_at = f.compare_at.value === '' ? null : Math.round(+f.compare_at.value);
      d.drop_name = f.drop_name.value.trim(); d.gender = f.gender.value;
      d.description = f.description.value.trim();
      d.badges = f.badges.value.split(',').map(s => s.trim()).filter(Boolean);
      d.featured = f.featured.checked;
      const sizes = [], stock = {};
      $$('[data-size]', el).forEach(inp => {
        const s = inp.value.trim().toUpperCase(); if (!s || sizes.includes(s)) return;
        sizes.push(s); stock[s] = Math.max(0, Math.round(+$(`[data-qty="${inp.dataset.size}"]`, el).value || 0));
      });
      d.sizes = sizes; d.stock = stock;
      d.colors = $$('[data-cname]', el).map(inp => ({ name: inp.value.trim(), hex: $(`[data-chex="${inp.dataset.cname}"]`, el).value })).filter((c, i, a) => c.name || a.length === 1);
      d.features = d.features.map((x, i) => ({ ...x, title: $(`[data-ftitle="${i}"]`, el)?.value.trim() ?? x.title, text: $(`[data-ftext="${i}"]`, el)?.value.trim() ?? x.text }));
    }

    form.name.addEventListener('input', () => { if (!slugTouched) form.slug.value = slugify(form.name.value); });
    form.slug.addEventListener('input', () => { slugTouched = true; });

    el.addEventListener('click', async (e) => {
      const t = e.target;
      if (t === el || t.closest('[data-close]')) { if (confirm('¿Cerrar sin guardar?')) close(); return; }
      if (t.closest('[data-add-size]')) { collect(); d.sizes.push(''); redraw('[data-stock]', stockRows()); $$('[data-size]', el).pop().focus(); }
      if (t.closest('[data-rm-size]')) { collect(); const i = +t.closest('[data-rm-size]').dataset.rmSize; const s = d.sizes[i]; d.sizes.splice(i, 1); delete d.stock[s]; redraw('[data-stock]', stockRows()); }
      if (t.closest('[data-add-color]')) { collect(); d.colors.push({ name: '', hex: '#ffffff' }); redraw('[data-colors]', colorRows()); }
      if (t.closest('[data-rm-color]')) { collect(); d.colors.splice(+t.closest('[data-rm-color]').dataset.rmColor, 1); redraw('[data-colors]', colorRows()); }
      if (t.closest('[data-img-rm]')) { if (!confirm('¿Quitar esta foto de la prenda?')) return; d.images.splice(+t.closest('[data-img-rm]').dataset.imgRm, 1); redraw('[data-imgs]', imgs()); redraw('[data-pick-wrap]', pick()); }
      if (t.closest('[data-img-first]')) { const i = +t.closest('[data-img-first]').dataset.imgFirst; d.images.unshift(...d.images.splice(i, 1)); redraw('[data-imgs]', imgs()); redraw('[data-pick-wrap]', pick()); }
      if (t.closest('[data-add-feat]')) { collect(); d.features.push({ title: '', text: '', x: 50, y: 50 }); selFeat = d.features.length - 1; redraw('[data-feats]', feats()); redraw('[data-pick-wrap]', pick()); }
      if (t.closest('[data-rm-feat]')) { collect(); d.features.splice(+t.closest('[data-rm-feat]').dataset.rmFeat, 1); selFeat = -1; redraw('[data-feats]', feats()); redraw('[data-pick-wrap]', pick()); }
      if (t.closest('[data-fsel]')) { collect(); const i = +t.closest('[data-fsel]').dataset.fsel; selFeat = selFeat === i ? -1 : i; redraw('[data-feats]', feats()); redraw('[data-pick-wrap]', pick()); $('[data-pick]', el)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      const pk = t.closest('[data-pick]');
      if (pk && selFeat >= 0) {
        collect();
        const r = pk.getBoundingClientRect();
        d.features[selFeat].x = Math.round(((e.clientX - r.left) / r.width) * 100);
        d.features[selFeat].y = Math.round(((e.clientY - r.top) / r.height) * 100);
        redraw('[data-feats]', feats()); redraw('[data-pick-wrap]', pick());
      }
      if (t.closest('[data-save]')) save();
      if (t.closest('[data-del]')) del();
    });

    el.addEventListener('change', async (e) => {
      if (!e.target.matches('[data-upload]')) return;
      const files = [...e.target.files]; if (!files.length) return;
      collect();
      const lbl = $('[data-up-lbl]', el); busy = true;
      try {
        for (let i = 0; i < files.length; i++) {
          lbl.innerHTML = `<span class="spin"></span> Subiendo ${i + 1} de ${files.length}…`;
          d.images.push(await uploadImage(files[i], uploadKey));
        }
        toast(files.length === 1 ? 'Foto subida' : `${files.length} fotos subidas`);
      } catch (ex) { toast(ex.message, true); }
      busy = false;
      redraw('[data-imgs]', imgs()); redraw('[data-pick-wrap]', pick());
    });

    async function save() {
      if (busy) return toast('Espera a que terminen de subir las fotos', true);
      collect();
      if (!d.name) { form.name.focus(); return toast('Ponle un nombre a la prenda', true); }
      if (d.status === 'active') {
        if (!d.price) { form.price.focus(); return toast('Para publicarla necesita precio', true); }
        if (!d.images.length) return toast('Para publicarla necesita al menos una foto', true);
        if (!d.sizes.length) return toast('Para publicarla necesita al menos una talla', true);
      }
      if (d.compare_at && d.price && d.compare_at <= d.price) return toast('El precio anterior debe ser mayor que el precio actual', true);
      const row = {
        name: d.name, slug: d.slug, status: d.status, featured: d.featured, category: d.category, drop_name: d.drop_name, gender: d.gender,
        price: d.price, compare_at: d.compare_at, description: d.description, badges: d.badges, colors: d.colors.filter(c => c.name),
        sizes: d.sizes, stock: d.stock, images: d.images, features: d.features.filter(f => f.title),
      };
      const b = $('[data-save]', el); b.disabled = true; b.innerHTML = '<span class="spin"></span> Guardando…';
      try {
        let saved;
        if (isNew) {
          row.sort = Math.max(0, ...st.products.map(p => p.sort || 0)) + 1;
          [saved] = await api('products', { method: 'POST', body: row, prefer: 'return=representation' });
        } else {
          [saved] = await api(`products?id=eq.${encodeURIComponent(d.id)}`, { method: 'PATCH', body: row, prefer: 'return=representation' });
        }
        // Solo una prenda destacada a la vez
        if (row.featured) await api(`products?featured=eq.true&id=neq.${encodeURIComponent(saved.id)}`, { method: 'PATCH', body: { featured: false } });
        toast(isNew ? 'Prenda creada ✓' : 'Cambios guardados ✓ Ya se ven en la tienda');
        close(); await load();
      } catch (ex) { toast(ex.message, true); b.disabled = false; b.textContent = isNew ? 'Crear prenda' : 'Guardar cambios'; }
    }

    async function del() {
      if (!confirm(`¿Eliminar "${d.name}" para siempre?\n\nSi solo quieres ocultarla, cambia el estado a "Archivada".`)) return;
      try {
        await api(`products?id=eq.${encodeURIComponent(d.id)}`, { method: 'DELETE' });
        toast('Prenda eliminada'); close(); await load();
      } catch (ex) {
        toast(/foreign|violates/i.test(ex.message) ? 'No se puede eliminar porque tiene pedidos. Archívala.' : ex.message, true);
      }
    }
  }

  /* ---------------- Pedidos ---------------- */
  function orders() {
    if (!st.orders.length) return '<div class="empty">Aún no hay pedidos. Cuando alguien compre en la web, aparecerá aquí.</div>';
    return `<div class="olist">${st.orders.map(o => {
      const c = o.customer || {}, a = o.address || {};
      return `<article class="order">
        <div class="order__head"><b>${esc(o.number)}</b><span class="muted small">${date(o.created_at)}</span></div>
        <div class="small">
          <strong>${esc(c.name || '')}</strong> · ${esc(c.email || '')} · ${esc(c.phone || '')}<br>
          <span class="muted">${esc([a.line1, a.line2, a.city, a.region].filter(Boolean).join(', '))}</span>
          ${o.notes ? `<br><span class="muted">Nota: ${esc(o.notes)}</span>` : ''}
        </div>
        <ul class="small">${(o.items || []).map(i => `<li>${esc(i.qty)} × ${esc(i.name)} (talla ${esc(i.size)}) — ${money(i.unitPrice * i.qty)}</li>`).join('')}</ul>
        <div class="order__head">
          <span>Total <strong>${money(o.total)}</strong> <span class="muted small">(envío ${money(o.shipping)})</span></span>
          <select class="select" data-ostatus="${esc(o.id)}" aria-label="Estado del pedido">${Object.entries(ORDER_STATUS).map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
      </article>`;
    }).join('')}</div>`;
  }
  app.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-ostatus]')) return;
    try { await api(`orders?id=eq.${e.target.dataset.ostatus}`, { method: 'PATCH', body: { status: e.target.value } }); toast('Estado actualizado'); }
    catch (ex) { toast(ex.message, true); }
  });

  /* ---------------- Consentimientos (prueba para la SIC) ---------------- */
  const PURPOSE = { terminos: 'Términos', privacidad: 'Privacidad', mayoria_edad: 'Mayor de 18', marketing: 'Publicidad', cookies_analitica: 'Cookies analítica' };
  function consents() {
    const q = st.q.toLowerCase();
    const list = st.consents.filter(c => !q || [c.email, c.anon_id, c.form, c.purpose].join(' ').toLowerCase().includes(q));
    return `
    <div class="bar">
      <input class="input" type="search" placeholder="Buscar por correo…" value="${esc(st.q)}" data-q>
      <button class="btn btn--sm" data-csv>Descargar CSV</button>
    </div>
    <p class="muted small" style="margin:0 0 12px">Cada fila es una aceptación o un retiro, con la hora del servidor. Nunca se borran: sirven como prueba ante la SIC.</p>
    ${list.length ? `<div class="tbl-wrap"><table>
      <thead><tr><th>Fecha</th><th>Correo</th><th>Qué</th><th>Decisión</th><th>Versión</th><th>Dónde</th><th>IP</th></tr></thead>
      <tbody>${list.map(c => `<tr>
        <td>${date(c.server_ts)}</td><td>${esc(c.email || '— anónimo —')}</td><td>${esc(PURPOSE[c.purpose] || c.purpose)}</td>
        <td class="${c.granted ? 'yes' : 'no'}">${c.granted ? 'Aceptó' : 'No aceptó / retiró'}</td>
        <td>${esc(c.doc_version)}</td><td>${esc(c.form || '')}</td><td>${esc(c.ip || '')}</td>
      </tr>`).join('')}</tbody></table></div>` : '<div class="empty">Aún no hay registros.</div>'}`;
  }
  app.addEventListener('click', (e) => {
    if (!e.target.closest('[data-csv]')) return;
    const cols = ['server_ts', 'email', 'anon_id', 'user_id', 'purpose', 'granted', 'doc_version', 'doc_url', 'text_shown', 'method', 'form', 'page_url', 'ip', 'user_agent', 'id'];
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = '﻿' + [cols.join(','), ...st.consents.map(r => cols.map(k => cell(r[k])).join(','))].join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `consentimientos-sfurban-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });

  start();
})();
