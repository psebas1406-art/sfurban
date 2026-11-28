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
  /* Ventana de confirmación propia. Reemplaza al confirm() del navegador, que algunos
     celulares y navegadores dentro de apps (Instagram, WhatsApp…) bloquean sin avisar. */
  function ask(message, okLabel = 'Aceptar', danger = false) {
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'ask';
      m.innerHTML = `<div class="ask__box" role="alertdialog" aria-modal="true">
        <p>${esc(message).replace(/\n/g, '<br>')}</p>
        <div class="ask__btns"><button class="btn btn--ghost" data-no>Cancelar</button><button class="btn ${danger ? 'btn--danger-solid' : 'btn--accent'}" data-yes>${esc(okLabel)}</button></div>
      </div>`;
      document.body.appendChild(m);
      const done = (v) => { m.remove(); removeEventListener('keydown', onKey); resolve(v); };
      const onKey = (e) => { if (e.key === 'Escape') done(false); };
      addEventListener('keydown', onKey);
      m.addEventListener('click', (e) => {
        if (e.target.closest('[data-yes]')) done(true);
        else if (e.target.closest('[data-no]') || e.target === m) done(false);
      });
      setTimeout(() => m.querySelector('[data-yes]').focus(), 30);
    });
  }

  // Elimina una prenda y confirma con la base de datos que de verdad se borró
  async function deleteProduct(p) {
    if (!(await ask(`¿Eliminar "${p.name}" para siempre?\n\nSi solo quieres ocultarla de la tienda, cambia su estado a "Archivada".`, 'Eliminar', true))) return false;
    try {
      const gone = await api(`products?id=eq.${encodeURIComponent(p.id)}`, { method: 'DELETE', prefer: 'return=representation' });
      if (!gone || !gone.length) throw new Error('No se pudo eliminar: la prenda ya no existe o tu usuario no tiene permiso.');
      st.products = st.products.filter(x => x.id !== p.id);
      toast(`"${p.name}" eliminada ✓`); render();
      return true;
    } catch (ex) { toast(ex.message, true); return false; }
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

  /* Usuarios del panel → correo de su cuenta en Supabase.
     La contraseña NO está aquí: la guarda y la verifica Supabase (cifrada).
     El usuario no distingue mayúsculas. También se puede entrar con el correo. */
  const ADMIN_USERS = { sfurban1812: 'sfurban.1814@gmail.com' };
  const userToEmail = (u) => { const k = String(u || '').trim().toLowerCase(); return k.includes('@') ? k : (ADMIN_USERS[k] || null); };
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
        <label class="field"><span>Usuario</span><input class="input" name="user" type="text" autocomplete="username" autocapitalize="off" autocorrect="off" spellcheck="false" required></label>
        <label class="field"><span>Contraseña</span><input class="input" name="password" type="password" autocomplete="current-password" required></label>
        <p class="err" data-err>${esc(msg)}</p>
        <button class="btn btn--accent" type="submit">Entrar</button>
      </form>
    </section>`;
    $('[data-login]').addEventListener('submit', async (e) => {
      e.preventDefault(); const f = e.target, b = $('button', f), err = $('[data-err]');
      b.disabled = true; b.innerHTML = '<span class="spin"></span>'; err.textContent = '';
      try {
        const email = userToEmail(f.user.value);
        if (!email) throw new Error('invalid');
        await login(email, f.password.value); await start();
      }
      catch (ex) { err.textContent = /invalid/i.test(ex.message) ? 'Usuario o contraseña incorrectos.' : ex.message; b.disabled = false; b.textContent = 'Entrar'; }
    });
  }

  /* ---------------- Estado del panel ---------------- */
  const TABS = [['resumen', 'Resumen'], ['ventas', 'Ventas'], ['inventario', 'Inventario'], ['pedidos', 'Pedidos'], ['clientes', 'Clientes'], ['consentimientos', 'Consentimientos']];
  const st = {
    tab: (location.hash.slice(1) && TABS.some(t => t[0] === location.hash.slice(1))) ? location.hash.slice(1) : 'resumen',
    products: [], categories: [], orders: [], consents: [], customers: [], admins: [], events: [], accounts: [],
    q: '', loaded: false, period: 'dia', metric: 'dinero', orderFilter: 'todos', table: false,
  };

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
      ${TABS.map(([k, l]) => `<button role="tab" data-tab="${k}" class="${st.tab === k ? 'is-on' : ''}">${l}</button>`).join('')}
      <button class="tabs__reload" data-reload title="Actualizar datos" aria-label="Actualizar datos">↻</button>
    </nav>
    <div class="wrap" data-view><p class="muted"><span class="spin"></span> Cargando…</p></div>`;
    $('[data-logout]').onclick = logout;
    $$('[data-tab]').forEach(b => b.onclick = () => {
      st.tab = b.dataset.tab; st.q = ''; history.replaceState(null, '', '#' + st.tab);
      $$('[data-tab]').forEach(x => x.classList.toggle('is-on', x === b)); render(); scrollTo({ top: 0 });
    });
    $('[data-reload]').onclick = () => load(true);
  }

  // Trae todo una vez (y al tocar ↻). Los cálculos de estadísticas se hacen aquí mismo.
  async function load(force) {
    const v = $('[data-view]');
    if (force && v) v.insertAdjacentHTML('afterbegin', '<p class="muted small" data-loading><span class="spin"></span> Actualizando…</p>');
    try {
      const since = new Date(Date.now() - 90 * 864e5).toISOString();
      [st.products, st.categories, st.orders, st.customers, st.admins, st.consents, st.events, st.accounts] = await Promise.all([
        api('products?select=*&order=sort.asc,created_at.asc'),
        api('categories?select=*&order=sort.asc'),
        api('orders?select=*&order=created_at.desc&limit=2000'),
        api('customers?select=*&order=created_at.desc&limit=2000').catch(() => []),
        api('admins?select=email').catch(() => []),
        api('consent_records?select=*&order=server_ts.desc&limit=1000'),
        api(`events?select=type,user_id,anon_id,path,data,created_at&created_at=gte.${since}&order=created_at.desc&limit=10000`).catch(() => []),
        api('account_activity?select=*&order=created_at.desc&limit=1000').catch(() => []),
      ]);
      st.loaded = true;
      render();
    } catch (ex) { if (v) v.innerHTML = `<div class="empty">${esc(ex.message)}</div>`; }
  }

  function render() {
    const v = $('[data-view]'); if (!v || !st.loaded) return;
    const views = { resumen, ventas, inventario: inventory, pedidos: orders, clientes, consentimientos: consents };
    v.innerHTML = views[st.tab]();
    bindCharts(v);
  }

  /* =========================================================
     Cálculos (ventas = pedidos pagados, enviados o entregados)
     ========================================================= */
  const PAID = ['paid', 'shipped', 'delivered'];
  const isPaid = (o) => PAID.includes(o.status);
  const units = (o) => (o.items || []).reduce((a, i) => a + (+i.qty || 0), 0);
  const adminEmails = () => new Set(st.admins.map(a => a.email));
  const realCustomers = () => st.customers.filter(c => !adminEmails().has(c.email));
  const isAdminEmail = (email) => adminEmails().has(email);
  // Nombre a mostrar: el que escribió al registrarse o, si no hay, la primera parte del correo
  const displayName = (c) => (c?.name || '').trim() || (c?.email ? c.email.split('@')[0] : '(sin nombre)');

  /* ---------- Movimientos de cuentas (registro de seguridad, siempre activo) ---------- */
  const ACCOUNT_ACTION = {
    signup: ['✚', 'Creó su cuenta'],
    email_confirmed: ['✉', 'Confirmó su correo'],
    login: ['→', 'Inició sesión'],
    password_reset_requested: ['?', 'Pidió recuperar la contraseña'],
    password_changed: ['🔑', 'Cambió su contraseña'],
    account_deleted: ['✕', 'Eliminó su cuenta'],
    deleted_by_admin: ['✕', 'Datos eliminados por la tienda'],
  };
  function accountList(rows, { withWho = true } = {}) {
    if (!rows.length) return '<p class="muted small" style="margin:0">Aún no hay movimientos.</p>';
    return `<ul class="acts">${rows.map(a => {
      const [ic, label] = ACCOUNT_ACTION[a.action] || ['•', a.action];
      const c = st.customers.find(x => x.id === a.user_id);
      const name = displayName(c || { name: a.name, email: a.email });
      const who = withWho
        ? `<b>${c ? `<button class="linkbtn" style="padding:0" data-customer="${esc(c.id)}">${esc(name)}</button>` : esc(name)}${isAdminEmail(a.email) ? '<span class="tag-admin">Admin</span>' : ''}</b><span class="muted small">${esc(label)} · ${esc(a.email || '')}</span>`
        : `<b>${esc(label)}</b>`;
      return `<li><span class="acts__ic" aria-hidden="true">${ic}</span><span class="acts__who">${who}</span><time>${date(a.created_at)}</time></li>`;
    }).join('')}</ul>`;
  }
  const day = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
  const fmtDay = (d) => `${d.getDate()} ${d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')}`;
  const compact = (n) => n >= 1e6 ? `$${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} M` : n >= 1e3 ? `$${Math.round(n / 1e3)} mil` : `$${n}`;

  // Agrupa las ventas por día (30), semana (12) o mes (12)
  function series(period, metric) {
    const now = day(new Date()), buckets = [];
    if (period === 'dia') for (let i = 29; i >= 0; i--) { const s = new Date(now); s.setDate(s.getDate() - i); const e = new Date(s); e.setDate(e.getDate() + 1); buckets.push({ s, e, label: fmtDay(s) }); }
    if (period === 'semana') {
      const monday = new Date(now); monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      for (let i = 11; i >= 0; i--) { const s = new Date(monday); s.setDate(s.getDate() - i * 7); const e = new Date(s); e.setDate(e.getDate() + 7); buckets.push({ s, e, label: `Sem. ${fmtDay(s)}` }); }
    }
    if (period === 'mes') for (let i = 11; i >= 0; i--) { const s = new Date(now.getFullYear(), now.getMonth() - i, 1); const e = new Date(s.getFullYear(), s.getMonth() + 1, 1); buckets.push({ s, e, label: s.toLocaleDateString('es-CO', { month: 'short', year: '2-digit' }) }); }
    const paid = st.orders.filter(isPaid);
    return buckets.map(b => {
      const os = paid.filter(o => { const t = new Date(o.created_at); return t >= b.s && t < b.e; });
      const value = metric === 'dinero' ? os.reduce((a, o) => a + o.total, 0) : os.reduce((a, o) => a + units(o), 0);
      return { label: b.label, value, tip: `${b.label}: ${metric === 'dinero' ? money(value) : value + ' prendas'} · ${os.length} pedido${os.length === 1 ? '' : 's'}` };
    });
  }

  function topProducts(limit = 10) {
    const m = new Map();
    for (const o of st.orders.filter(isPaid)) for (const i of o.items || []) {
      const r = m.get(i.productId) || { id: i.productId, name: i.name, units: 0, revenue: 0 };
      r.units += +i.qty || 0; r.revenue += (+i.qty || 0) * (+i.unitPrice || 0); m.set(i.productId, r);
    }
    return [...m.values()].map(r => ({ ...r, name: st.products.find(p => p.id === r.id)?.name || r.name })).sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, limit);
  }

  function customerStats(c) {
    const os = st.orders.filter(o => o.user_id === c.id);
    const paid = os.filter(isPaid);
    const stamps = paid.reduce((a, o) => a + units(o), 0);
    return { orders: os, paid, stamps, spent: paid.reduce((a, o) => a + o.total, 0), pending: os.filter(o => o.status === 'pending_payment').length, inCard: stamps % 10 };
  }

  /* =========================================================
     Gráficas (SVG propio, sin librerías). Una sola serie → un solo color (rojo
     de la marca, validado contra el fondo oscuro). Barras finas con punta
     redondeada, cuadrícula tenue, tooltip al pasar el dedo/mouse y vista de tabla.
     ========================================================= */
  function barChart(data, { fmt = (v) => v, height = 220 } = {}) {
    const W = 720, H = height, padL = 54, padR = 8, padT = 12, padB = 28;
    const max = Math.max(1, ...data.map(d => d.value));
    const nice = (() => { const p = Math.pow(10, Math.floor(Math.log10(max))); const m = max / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * p; })();
    const ticks = [0, nice / 2, nice];
    const iw = W - padL - padR, ih = H - padT - padB, step = iw / data.length, bw = Math.max(3, Math.min(28, step - 4));
    const y = (v) => padT + ih - (v / nice) * ih;
    const every = Math.ceil(data.length / 8);
    const bar = (d, i) => {
      const x = padL + i * step + (step - bw) / 2, top = y(d.value), h = padT + ih - top;
      if (h <= 0) return `<rect class="ch-hit" x="${padL + i * step}" y="${padT}" width="${step}" height="${ih}" data-tip="${esc(d.tip)}"/>`;
      const r = Math.min(4, bw / 2, h);
      return `<path class="ch-bar" d="M${x},${padT + ih}V${top + r}Q${x},${top} ${x + r},${top}H${x + bw - r}Q${x + bw},${top} ${x + bw},${top + r}V${padT + ih}Z"/>
        <rect class="ch-hit" x="${padL + i * step}" y="${padT}" width="${step}" height="${ih}" data-tip="${esc(d.tip)}"/>`;
    };
    return `<div class="chart" data-chart>
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de barras">
        ${ticks.map(t => `<line class="ch-grid" x1="${padL}" x2="${W - padR}" y1="${y(t)}" y2="${y(t)}"/><text class="ch-ax" x="${padL - 8}" y="${y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('')}
        ${data.map(bar).join('')}
        ${data.map((d, i) => (data.length - 1 - i) % every === 0 ? `<text class="ch-ax" x="${padL + i * step + step / 2}" y="${H - 8}" text-anchor="middle">${esc(d.label)}</text>` : '').join('')}
      </svg>
      <div class="ch-tip" hidden></div>
    </div>`;
  }
  function bindCharts(root) {
    $$('[data-chart]', root).forEach(ch => {
      const tip = $('.ch-tip', ch);
      const show = (e) => {
        const t = e.target.closest('[data-tip]'); if (!t) { tip.hidden = true; return; }
        $$('.ch-hit', ch).forEach(h => h.classList.toggle('is-on', h === t));
        tip.textContent = t.dataset.tip; tip.hidden = false;
        const r = ch.getBoundingClientRect(), b = t.getBoundingClientRect();
        tip.style.left = Math.min(r.width - tip.offsetWidth - 4, Math.max(4, b.left - r.left + b.width / 2 - tip.offsetWidth / 2)) + 'px';
      };
      ch.addEventListener('pointermove', show);
      ch.addEventListener('pointerdown', show);
      ch.addEventListener('pointerleave', () => { tip.hidden = true; $$('.ch-hit', ch).forEach(h => h.classList.remove('is-on')); });
    });
  }
  // Barras horizontales (ranking): el nombre siempre visible, el valor al final
  const hbars = (rows, val, fmt) => {
    const max = Math.max(1, ...rows.map(val));
    return `<div class="hbars">${rows.map(r => `<div class="hbar"><span class="hbar__name">${esc(r.name)}</span><span class="hbar__track"><i style="width:${Math.max(2, (val(r) / max) * 100)}%"></i></span><span class="hbar__val">${fmt(r)}</span></div>`).join('')}</div>`;
  };
  const tableView = (rows, cols) => `<div class="tbl-wrap"><table><thead><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${cols.map(c => `<td>${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const kpi = (label, value, sub = '', tone = '') => `<div class="kpi ${tone}"><span class="kpi__label">${label}</span><b class="kpi__value">${value}</b>${sub ? `<span class="kpi__sub">${sub}</span>` : ''}</div>`;

  /* =========================================================
     Resumen
     ========================================================= */
  function resumen() {
    const now = new Date(), monthStart = new Date(now.getFullYear(), now.getMonth(), 1), weekAgo = Date.now() - 7 * 864e5, d30 = Date.now() - 30 * 864e5;
    const paid = st.orders.filter(isPaid);
    const month = paid.filter(o => new Date(o.created_at) >= monthStart);
    const pend = st.orders.filter(o => o.status === 'pending_payment');
    const cust = realCustomers();
    const newWeek = cust.filter(c => new Date(c.created_at) >= weekAgo).length;
    const active30 = cust.filter(c => c.last_login_at && new Date(c.last_login_at) >= d30).length;
    const low = [];
    st.products.filter(p => p.status === 'active').forEach(p => (p.sizes || []).forEach(s => { const k = +(p.stock?.[s] || 0); if (k <= 3) low.push({ p, s, k }); }));
    const visitors7 = new Set(st.events.filter(e => new Date(e.created_at) >= weekAgo).map(e => e.user_id || e.anon_id)).size;
    const top = topProducts(5);
    return `
    <div class="kpis">
      ${kpi('Ventas este mes', money(month.reduce((a, o) => a + o.total, 0)), `${month.length} pedido${month.length === 1 ? '' : 's'} pagado${month.length === 1 ? '' : 's'}`)}
      ${kpi('Por cobrar', money(pend.reduce((a, o) => a + o.total, 0)), `${pend.length} pedido${pend.length === 1 ? '' : 's'} reservado${pend.length === 1 ? '' : 's'}`, pend.length ? 'kpi--warn' : '')}
      ${kpi('Clientes con cuenta', cust.length, `${newWeek} nuevo${newWeek === 1 ? '' : 's'} esta semana · ${active30} activo${active30 === 1 ? '' : 's'} (30 días)`)}
      ${kpi('Prendas vendidas', paid.reduce((a, o) => a + units(o), 0), 'en total')}
      ${kpi('Visitantes (7 días)', visitors7, 'solo quienes aceptaron analítica')}
      ${kpi('Tallas por agotarse', low.length, low.length ? 'quedan 3 o menos' : 'todo con stock', low.length ? 'kpi--warn' : '')}
    </div>
    <section class="card">
      <div class="card__head"><h2>Ventas de los últimos 30 días</h2><button class="btn btn--sm btn--ghost" data-goto="ventas">Ver más</button></div>
      ${barChart(series('dia', 'dinero'), { fmt: compact })}
    </section>
    <div class="grid-2">
      <section class="card">
        <div class="card__head"><h2>Más vendidos</h2><button class="btn btn--sm btn--ghost" data-goto="ventas">Ver todos</button></div>
        ${top.length ? hbars(top, r => r.units, r => `${r.units} u.`) : '<p class="muted small">Aún no hay ventas pagadas.</p>'}
      </section>
      <section class="card">
        <div class="card__head"><h2>Inventario por agotarse</h2><button class="btn btn--sm btn--ghost" data-goto="inventario">Inventario</button></div>
        ${low.length ? `<ul class="list">${low.slice(0, 8).map(x => `<li><span>${esc(x.p.name)} · talla <b>${esc(x.s)}</b></span><span class="${x.k === 0 ? 'out' : 'low'}">${x.k === 0 ? 'Agotada' : x.k + ' u.'}</span></li>`).join('')}</ul>` : '<p class="muted small">Todo con buen stock.</p>'}
      </section>
    </div>
    <section class="card">
      <div class="card__head"><h2>Movimientos de cuentas</h2><button class="btn btn--sm btn--ghost" data-goto="clientes">Clientes</button></div>
      ${accountList(st.accounts.slice(0, 8))}
    </section>
    <section class="card">
      <div class="card__head"><h2>Últimos pedidos</h2><button class="btn btn--sm btn--ghost" data-goto="pedidos">Ver todos</button></div>
      ${st.orders.length ? `<ul class="list">${st.orders.slice(0, 6).map(o => `<li><span><b>${esc(o.number)}</b> · ${esc(o.customer?.name || '')} <span class="muted small">${date(o.created_at)}</span></span><span><span class="chip chip--o-${o.status}">${ORDER_STATUS[o.status]}</span> ${money(o.total)}</span></li>`).join('')}</ul>` : '<p class="muted small">Aún no hay pedidos.</p>'}
    </section>`;
  }

  /* =========================================================
     Ventas (por día, semana o mes) + productos más vendidos
     ========================================================= */
  function ventas() {
    const data = series(st.period, st.metric);
    const total = data.reduce((a, d) => a + d.value, 0);
    const paid = st.orders.filter(isPaid);
    const ticket = paid.length ? Math.round(paid.reduce((a, o) => a + o.total, 0) / paid.length) : 0;
    const top = topProducts(15);
    const byCat = st.categories.map(c => ({ name: c.label, units: top.filter(t => st.products.find(p => p.id === t.id)?.category === c.id).reduce((a, t) => a + t.units, 0) })).filter(c => c.units);
    const unitLabel = { dia: 'los últimos 30 días', semana: 'las últimas 12 semanas', mes: 'los últimos 12 meses' }[st.period];
    return `
    <div class="bar">
      <div class="seg">${[['dia', 'Días'], ['semana', 'Semanas'], ['mes', 'Meses']].map(([k, l]) => `<button data-period="${k}" class="${st.period === k ? 'is-on' : ''}">${l}</button>`).join('')}</div>
      <div class="seg">${[['dinero', 'Dinero'], ['prendas', 'Prendas']].map(([k, l]) => `<button data-metric="${k}" class="${st.metric === k ? 'is-on' : ''}">${l}</button>`).join('')}</div>
    </div>
    <div class="kpis">
      ${kpi(`Total en ${unitLabel}`, st.metric === 'dinero' ? money(total) : `${total} prendas`)}
      ${kpi('Ticket promedio', money(ticket), 'por pedido pagado')}
      ${kpi('Pedidos pagados', paid.length, 'desde el inicio')}
    </div>
    <section class="card">
      <div class="card__head"><h2>${st.metric === 'dinero' ? 'Ventas en pesos' : 'Prendas vendidas'} · ${unitLabel}</h2><button class="btn btn--sm btn--ghost" data-table>${st.table ? 'Ver gráfica' : 'Ver tabla'}</button></div>
      ${st.table ? tableView(data, [['Periodo', d => esc(d.label)], [st.metric === 'dinero' ? 'Ventas' : 'Prendas', d => st.metric === 'dinero' ? money(d.value) : d.value]]) : barChart(data, { fmt: st.metric === 'dinero' ? compact : (v) => Math.round(v) })}
      <p class="muted small">Cuenta los pedidos <b>pagados, enviados o entregados</b>. Los reservados sin pagar no suman hasta que los marques como pagados en Pedidos.</p>
    </section>
    <div class="grid-2">
      <section class="card">
        <div class="card__head"><h2>Productos más vendidos</h2></div>
        ${top.length ? tableView(top, [['Prenda', r => esc(r.name)], ['Unidades', r => r.units], ['Ingresos', r => money(r.revenue)]]) : '<p class="muted small">Aún no hay ventas pagadas.</p>'}
      </section>
      <section class="card">
        <div class="card__head"><h2>Por categoría</h2></div>
        ${byCat.length ? hbars(byCat, r => r.units, r => `${r.units} u.`) : '<p class="muted small">Aún no hay ventas pagadas.</p>'}
      </section>
    </div>`;
  }

  /* =========================================================
     Clientes
     ========================================================= */
  function clientes() {
    const q = st.q.toLowerCase();
    const cust = realCustomers();
    // En la lista salen TODAS las cuentas (también las de ustedes, marcadas como Admin)
    const list = st.customers.filter(c => (!q || [c.name, c.email, c.phone].join(' ').toLowerCase().includes(q))
      && (!st.onlyInactive || (!isAdminEmail(c.email) && daysInactive(c) >= INACTIVE_DAYS)));
    const inactiveCount = cust.filter(c => daysInactive(c) >= INACTIVE_DAYS).length;
    const d30 = Date.now() - 30 * 864e5;
    return `
    <div class="kpis">
      ${kpi('Clientes con cuenta', cust.length, `${st.customers.length - cust.length} cuenta${st.customers.length - cust.length === 1 ? '' : 's'} de administrador aparte`)}
      ${kpi('Iniciaron sesión (30 días)', cust.filter(c => c.last_login_at && new Date(c.last_login_at) >= d30).length)}
      ${kpi('Con al menos una compra', cust.filter(c => st.orders.some(o => o.user_id === c.id && isPaid(o))).length)}
      ${kpi('Aceptan publicidad', cust.filter(c => c.marketing).length)}
    </div>
    <section class="card">
      <div class="card__head"><h2>Movimientos de cuentas</h2><span class="muted small">Registros, inicios de sesión y cambios de contraseña</span></div>
      ${accountList(st.accounts.slice(0, 40))}
    </section>
    <div class="bar"><input class="input" type="search" placeholder="Buscar por nombre, correo o celular…" value="${esc(st.q)}" data-q>
      <button class="chipbtn ${st.onlyInactive ? 'is-on' : ''}" data-inactive>Inactivos (+${INACTIVE_DAYS} días) <span>${inactiveCount}</span></button></div>
    ${list.length ? `<div class="clist">${list.map(c => {
      const s = customerStats(c);
      return `<button class="crow" data-customer="${esc(c.id)}">
        <span class="crow__avatar">${c.avatar_url ? `<img src="${esc(c.avatar_url)}" alt="">` : esc(displayName(c).charAt(0).toUpperCase())}</span>
        <span class="crow__main"><b>${esc(displayName(c))}${isAdminEmail(c.email) ? '<span class="tag-admin">Admin</span>' : ''}</b><span class="muted small">${esc(c.email)} · ${c.last_login_at ? 'último inicio ' + date(c.last_login_at) : 'creada ' + date(c.created_at)}</span></span>
        <span class="crow__stat"><b>${s.paid.length}</b><span class="muted small">compras</span></span>
        <span class="crow__stat"><b>${money(s.spent)}</b><span class="muted small">total</span></span>
        <span class="crow__dots" title="Tarjeta SF Club: ${s.inCard} de 10">${Array.from({ length: 10 }, (_, i) => `<i class="${i < s.inCard ? 'on' : ''}"></i>`).join('')}</span>
      </button>`;
    }).join('')}</div>` : `<div class="empty">${st.customers.length ? 'Nadie coincide con la búsqueda.' : 'Aún no hay cuentas. Cuando alguien se registre en la tienda, aparecerá aquí.'}</div>`}`;
  }

  const EVENT_LABEL = { view: 'Vio una sección', product_view: 'Vio una prenda', add_to_cart: 'Agregó al carrito', remove_from_cart: 'Quitó del carrito', wishlist_add: 'Guardó en favoritos', wishlist_remove: 'Quitó de favoritos', search: 'Buscó', filter: 'Filtró', sign_up: 'Creó su cuenta', login: 'Inició sesión', logout: 'Cerró sesión', checkout_order_created: 'Hizo un pedido', notify_me: 'Pidió aviso de prenda', chat_open: 'Abrió el chat', chat_message: 'Escribió al asistente' };
  function eventText(e) {
    const d = e.data || {};
    const prod = d.productId ? st.products.find(p => p.id === d.productId)?.name || d.productId : '';
    const extra = [prod, d.size ? `talla ${d.size}` : '', d.q ? `“${d.q}”` : '', d.view || '', d.orderNumber || '', d.total ? money(d.total) : ''].filter(Boolean).join(' · ');
    return `${EVENT_LABEL[e.type] || e.type}${extra ? ` <span class="muted">${esc(extra)}</span>` : ''}`;
  }

  /* ---------- Clientes inactivos y eliminación de datos ---------- */
  const INACTIVE_DAYS = 90;
  const daysInactive = (c) => Math.floor((Date.now() - new Date(c.last_login_at || c.created_at).getTime()) / 864e5);

  // Número para wa.me: solo dígitos y con indicativo de Colombia si falta
  const waNumber = (p) => { let d = String(p || '').replace(/\D/g, ''); if (d.length === 10 && d.startsWith('3')) d = '57' + d; return d.length >= 10 ? d : ''; };
  const deletionMessage = (name) => `Hola${name ? ' ' + name.split(' ')[0] : ''} 👋 Te escribimos de SF Urban. Debido a la falta de actividad en tu cuenta, tus datos fueron eliminados de nuestra tienda sfurban. Si quieres volver, puedes crear una cuenta nueva cuando quieras en ${location.origin + location.pathname.replace(/[^/]*$/, '')} ¡Gracias por ser parte de SF Urban!`;

  async function deleteCustomer(c, closeSheet) {
    const name = displayName(c);
    if (!(await ask(`¿Eliminar todos los datos de ${name}?\n\nSe borra su cuenta, perfil, foto y actividad. No se puede deshacer.`, 'Eliminar datos', true))) return;
    try {
      // La foto se borra primero (el archivo vive aparte de la base de datos)
      if (c.avatar_url) {
        const m = c.avatar_url.match(/\/avatars\/(.+)$/);
        if (m) await fetch(`${cfg.url}/storage/v1/object/avatars/${m[1]}`, { method: 'DELETE', headers: { apikey: cfg.anonKey, Authorization: `Bearer ${await token()}` } }).catch(() => {});
      }
      const r = await api('rpc/admin_eliminar_cliente', { method: 'POST', body: { cliente: c.id } });
      st.customers = st.customers.filter(x => x.id !== c.id);
      st.accounts.unshift({ user_id: c.id, email: c.email, name: c.name, action: 'deleted_by_admin', created_at: new Date().toISOString() });
      closeSheet(); render();
      notifyDeletion({ name: r?.name || c.name, phone: r?.phone || c.phone, email: r?.email || c.email });
    } catch (ex) { toast(ex.message, true); }
  }

  /* Aviso por WhatsApp. Hoy no se puede enviar 100 % automático porque la API oficial
     de WhatsApp de Meta está en pausa (requiere RUT). Por eso se abre WhatsApp con el
     mensaje YA ESCRITO al número del cliente: solo hay que tocar "Enviar". */
  function notifyDeletion({ name, phone, email }) {
    const n = waNumber(phone), msg = deletionMessage(name);
    const m = document.createElement('div'); m.className = 'ask';
    m.innerHTML = `<div class="ask__box" role="alertdialog" aria-modal="true">
      <p><b>Datos eliminados ✓</b><br>${n ? `Avísale a ${esc(name || 'la persona')} por WhatsApp. El mensaje ya va escrito:` : `${esc(name || 'Esta persona')} no registró número de celular. Puedes avisarle por correo:`}</p>
      <p class="ask__msg">${esc(msg)}</p>
      <div class="ask__btns">
        <button class="btn btn--ghost" data-no>Cerrar</button>
        ${n ? `<a class="btn btn--wa" href="https://wa.me/${n}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener" data-yes>Enviar por WhatsApp</a>`
            : email ? `<a class="btn btn--accent" href="mailto:${esc(email)}?subject=${encodeURIComponent('Tus datos en SF Urban')}&body=${encodeURIComponent(msg)}" data-yes>Enviar por correo</a>` : ''}
      </div></div>`;
    document.body.appendChild(m);
    m.addEventListener('click', (e) => { if (e.target.closest('[data-no],[data-yes]') || e.target === m) setTimeout(() => m.remove(), 50); });
  }

  async function openCustomer(id) {
    const c = st.customers.find(x => x.id === id); if (!c) return;
    const s = customerStats(c);
    const el = document.createElement('div'); el.className = 'sheet';
    document.body.appendChild(el); document.body.style.overflow = 'hidden';
    const close = () => { el.remove(); document.body.style.overflow = ''; };
    el.addEventListener('click', (e) => {
      if (e.target === el || e.target.closest('[data-close]')) close();
      if (e.target.closest('[data-del-customer]')) deleteCustomer(c, close);
    });
    const cons = st.consents.filter(x => x.email && x.email === c.email);
    const inactiveDays = daysInactive(c);
    const stamps = Array.from({ length: 10 }, (_, i) => `<span class="stamp ${i < s.inCard ? 'is-on' : ''} ${i === 9 ? 'is-reward' : ''}">${i === 9 ? '60%' : `<img src="${LOGO}" alt="">`}</span>`).join('');
    const addr = c.address ? [c.address.line1, c.address.line2, c.address.city, c.address.region].filter(Boolean).join(', ') : '';
    el.innerHTML = `
    <div class="sheet__panel" role="dialog" aria-modal="true" aria-label="Cliente">
      <div class="sheet__head"><h2>${esc(displayName(c))}${isAdminEmail(c.email) ? '<span class="tag-admin">Admin</span>' : ''}</h2><button class="btn btn--sm btn--ghost" data-close>Cerrar</button></div>
      <div class="sheet__body">
        <section class="group">
          <h3>Datos</h3>
          ${c.avatar_url ? `<img class="cust-photo" src="${esc(c.avatar_url)}" alt="Foto de perfil">` : ''}
          <dl class="dl">
            <dt>Correo</dt><dd>${esc(c.email)}</dd>
            <dt>Celular</dt><dd>${esc(c.phone || '—')}</dd>
            <dt>Avisos por WhatsApp</dt><dd>${c.whatsapp_optin ? '<span class="yes">Autorizados</span>' : '<span class="muted">No autorizados</span>'}</dd>
            <dt>Sin actividad</dt><dd>${inactiveDays} día${inactiveDays === 1 ? '' : 's'}${inactiveDays >= INACTIVE_DAYS ? ' <span class="chip chip--o-cancelled">Inactivo</span>' : ''}</dd>
            <dt>Dirección</dt><dd>${esc(addr || '—')}</dd>
            <dt>Cuenta creada</dt><dd>${date(c.created_at)}</dd>
            <dt>Último inicio de sesión</dt><dd>${c.last_login_at ? date(c.last_login_at) : '—'}</dd>
            <dt>Inicios de sesión</dt><dd>${c.login_count || 0}</dd>
            <dt>Publicidad</dt><dd>${c.marketing ? '<span class="yes">Autorizada</span>' : '<span class="muted">No autorizada</span>'}</dd>
          </dl>
        </section>
        <div class="kpis kpis--3">
          ${kpi('Compras pagadas', s.paid.length)}
          ${kpi('Prendas', s.stamps)}
          ${kpi('Total gastado', money(s.spent))}
        </div>
        <section class="group">
          <h3>Tarjeta SF Club</h3>
          <div class="mini-card"><div class="mini-card__head"><img src="${LOGO}" alt=""><span>${esc(displayName(c))}</span><b>${s.inCard}/10</b></div><div class="mini-card__stamps">${stamps}</div></div>
          <p class="muted small" style="margin:0">${s.inCard === 9 ? '¡Su próxima prenda tiene 60 % de descuento!' : `Le faltan ${9 - s.inCard} prenda${9 - s.inCard === 1 ? '' : 's'} para el 60 %.`} Lleva ${Math.floor(s.stamps / 10)} premio${Math.floor(s.stamps / 10) === 1 ? '' : 's'} ganado${Math.floor(s.stamps / 10) === 1 ? '' : 's'}.${s.pending ? ` Tiene ${s.pending} pedido${s.pending === 1 ? '' : 's'} por pagar (aún no suman sellos).` : ''}</p>
        </section>
        <section class="group">
          <h3>Pedidos (${s.orders.length})</h3>
          ${s.orders.length ? `<ul class="list">${s.orders.map(o => `<li><span><b>${esc(o.number)}</b> · ${units(o)} prenda${units(o) === 1 ? '' : 's'} <span class="muted small">${date(o.created_at)}</span>${o.discount ? ' <span class="chip chip--star">SF Club</span>' : ''}</span><span><span class="chip chip--o-${o.status}">${ORDER_STATUS[o.status]}</span> ${money(o.total)}</span></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">Aún no ha hecho pedidos.</p>'}
        </section>
        <section class="group">
          <h3>Movimientos de la cuenta</h3>
          ${accountList(st.accounts.filter(a => a.user_id === c.id).slice(0, 50), { withWho: false })}
        </section>
        <section class="group">
          <h3>Actividad en la tienda</h3>
          <div data-activity><p class="muted small"><span class="spin"></span> Cargando…</p></div>
          <p class="muted small" style="margin:0">Solo se registra si la persona aceptó la analítica en el aviso de cookies.</p>
        </section>
        <section class="group">
          <h3>Autorizaciones (${cons.length})</h3>
          ${cons.length ? `<ul class="list">${cons.slice(0, 20).map(x => `<li><span>${esc(PURPOSE[x.purpose] || x.purpose)} <span class="muted small">${esc(x.form || '')} · ${esc(x.doc_version)}</span></span><span class="${x.granted ? 'yes' : 'no'}">${x.granted ? 'Aceptó' : 'Retiró'} · <span class="muted small">${date(x.server_ts)}</span></span></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">Sin registros (puede que el servidor aún no tenga la clave permanente).</p>'}
        </section>
        ${isAdminEmail(c.email) ? '' : `<section class="group group--danger">
          <h3>Eliminar datos del cliente</h3>
          <p class="muted small" style="margin:0">Borra su cuenta, perfil, foto y actividad de la tienda. Sus pedidos se conservan sin su nombre (obligación contable) y sus autorizaciones se conservan como prueba legal. Después podrás avisarle por WhatsApp.</p>
          <button class="btn btn--danger" data-del-customer>Eliminar datos de ${esc(displayName(c))}</button>
        </section>`}
      </div>
    </div>`;
    try {
      const evs = await api(`events?select=type,path,data,created_at&user_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=150`);
      const box = $('[data-activity]', el); if (!box) return;
      box.innerHTML = evs.length ? `<ul class="timeline">${evs.map(e => `<li><time>${date(e.created_at)}</time><span>${eventText(e)}</span></li>`).join('')}</ul>` : '<p class="muted small" style="margin:0">Sin actividad registrada.</p>';
    } catch (ex) { const box = $('[data-activity]', el); if (box) box.innerHTML = `<p class="muted small">${esc(ex.message)}</p>`; }
  }

  // Navegación y controles de las vistas nuevas
  app.addEventListener('click', (e) => {
    const t = e.target.closest('[data-goto],[data-period],[data-metric],[data-table],[data-customer],[data-ofilter]'); if (!t) return;
    if (t.dataset.goto) $(`[data-tab="${t.dataset.goto}"]`)?.click();
    else if (t.dataset.period) { st.period = t.dataset.period; render(); }
    else if (t.dataset.metric) { st.metric = t.dataset.metric; render(); }
    else if (t.matches('[data-table]')) { st.table = !st.table; render(); }
    else if (t.dataset.customer) openCustomer(t.dataset.customer);
    else if (t.dataset.ofilter) { st.orderFilter = t.dataset.ofilter; render(); }
  });
  app.addEventListener('click', (e) => { if (e.target.closest('[data-inactive]')) { st.onlyInactive = !st.onlyInactive; render(); } });

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
          <button class="btn btn--sm" data-edit="${esc(p.id)}">Editar todo</button>
          <form class="quick" data-quick="${esc(p.id)}">
            <label class="quick__f"><span>Precio</span><input class="input" name="price" type="number" min="0" step="100" inputmode="numeric" value="${p.price ?? ''}"></label>
            ${(p.sizes || []).map(s => `<label class="quick__f quick__f--s"><span>${esc(s)}</span><input class="input" name="s_${esc(s)}" type="number" min="0" inputmode="numeric" value="${+(p.stock?.[s] || 0)}"></label>`).join('')}
            <label class="quick__f"><span>Estado</span><select class="select" name="status">${Object.entries(STATUS).map(([k, l]) => `<option value="${k}" ${p.status === k ? 'selected' : ''}>${l.replace(/ \(.*\)/, '')}</option>`).join('')}</select></label>
            <button class="btn btn--sm btn--accent quick__save" type="submit" hidden>Guardar</button>
            <button class="btn btn--sm btn--danger quick__del" type="button" data-qdel="${esc(p.id)}">Eliminar</button>
          </form>
        </article>`;
      }).join('') || '<div class="empty">No hay prendas que coincidan.</div>'}
    </div>`;
  }

  // Eliminar desde la lista del inventario
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-qdel]'); if (!b) return;
    e.preventDefault();
    const p = st.products.find(x => x.id === b.dataset.qdel); if (p) deleteProduct(p);
  });

  // Edición rápida: precio, unidades por talla y estado, sin abrir el editor
  app.addEventListener('input', (e) => { const f = e.target.closest('[data-quick]'); if (f) $('.quick__save', f).hidden = false; });
  app.addEventListener('change', (e) => { const f = e.target.closest('[data-quick]'); if (f) $('.quick__save', f).hidden = false; });
  app.addEventListener('submit', async (e) => {
    const f = e.target.closest('[data-quick]'); if (!f) return;
    e.preventDefault();
    const p = st.products.find(x => x.id === f.dataset.quick); if (!p) return;
    const price = f.price.value === '' ? null : Math.max(0, Math.round(+f.price.value));
    const stock = { ...(p.stock || {}) };
    (p.sizes || []).forEach(s => { stock[s] = Math.max(0, Math.round(+f[`s_${s}`].value || 0)); });
    const status = f.status.value;
    if (status === 'active' && (!price || !p.images?.length)) return toast('Para publicarla necesita precio y al menos una foto (usa "Editar todo").', true);
    const b = $('.quick__save', f); b.disabled = true; b.innerHTML = '<span class="spin"></span>';
    try {
      const [saved] = await api(`products?id=eq.${encodeURIComponent(p.id)}`, { method: 'PATCH', body: { price, stock, status }, prefer: 'return=representation' });
      Object.assign(p, saved); toast('Guardado ✓ Ya se ve en la tienda'); render();
    } catch (ex) { toast(ex.message, true); b.disabled = false; b.textContent = 'Guardar'; }
  });

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
      if (t === el || t.closest('[data-close]')) { if (await ask('¿Cerrar sin guardar los cambios?', 'Cerrar sin guardar')) close(); return; }
      if (t.closest('[data-add-size]')) { collect(); d.sizes.push(''); redraw('[data-stock]', stockRows()); $$('[data-size]', el).pop().focus(); }
      if (t.closest('[data-rm-size]')) { collect(); const i = +t.closest('[data-rm-size]').dataset.rmSize; const s = d.sizes[i]; d.sizes.splice(i, 1); delete d.stock[s]; redraw('[data-stock]', stockRows()); }
      if (t.closest('[data-add-color]')) { collect(); d.colors.push({ name: '', hex: '#ffffff' }); redraw('[data-colors]', colorRows()); }
      if (t.closest('[data-rm-color]')) { collect(); d.colors.splice(+t.closest('[data-rm-color]').dataset.rmColor, 1); redraw('[data-colors]', colorRows()); }
      if (t.closest('[data-img-rm]')) { if (!(await ask('¿Quitar esta foto de la prenda?', 'Quitar foto', true))) return; d.images.splice(+t.closest('[data-img-rm]').dataset.imgRm, 1); redraw('[data-imgs]', imgs()); redraw('[data-pick-wrap]', pick()); }
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
      if (await deleteProduct(d)) close();
    }
  }

  /* ---------------- Pedidos ---------------- */
  function orders() {
    if (!st.orders.length) return '<div class="empty">Aún no hay pedidos. Cuando alguien compre en la web, aparecerá aquí.</div>';
    const q = st.q.toLowerCase();
    const count = (k) => st.orders.filter(o => k === 'todos' || o.status === k).length;
    const list = st.orders.filter(o => (st.orderFilter === 'todos' || o.status === st.orderFilter) &&
      (!q || [o.number, o.customer?.name, o.customer?.email, o.customer?.phone].join(' ').toLowerCase().includes(q)));
    return `
    <div class="bar"><input class="input" type="search" placeholder="Buscar por número, nombre o correo…" value="${esc(st.q)}" data-q></div>
    <div class="chips">${[['todos', 'Todos'], ...Object.entries(ORDER_STATUS)].map(([k, l]) => `<button data-ofilter="${k}" class="chipbtn ${st.orderFilter === k ? 'is-on' : ''}">${l} <span>${count(k)}</span></button>`).join('')}</div>
    <p class="muted small">Al marcar un pedido como <b>Pagado</b>, sus prendas se descuentan solas del inventario y suman sellos a la tarjeta del cliente. Si luego lo cancelas o reembolsas, las unidades vuelven al inventario.</p>
    ${list.length ? '' : '<div class="empty">No hay pedidos con ese filtro.</div>'}
    <div class="olist">${list.map(o => {
      const c = o.customer || {}, a = o.address || {};
      return `<article class="order">
        <div class="order__head"><b>${esc(o.number)}</b><span class="muted small">${date(o.created_at)}</span></div>
        <div class="small">
          <strong>${esc(c.name || '')}</strong> · ${esc(c.email || '')} · ${esc(c.phone || '')}
          ${o.user_id && st.customers.some(x => x.id === o.user_id) ? `<button class="linkbtn" data-customer="${esc(o.user_id)}">Ver cliente</button>` : '<span class="muted">(sin cuenta)</span>'}<br>
          <span class="muted">${esc([a.line1, a.line2, a.city, a.region].filter(Boolean).join(', '))}</span>
          ${o.notes ? `<br><span class="muted">Nota: ${esc(o.notes)}</span>` : ''}
        </div>
        <ul class="small">${(o.items || []).map(i => `<li>${esc(i.qty)} × ${esc(i.name)} (talla ${esc(i.size)}) — ${money(i.unitPrice * i.qty)}</li>`).join('')}</ul>
        ${o.discount ? `<div class="loyal-note small"><b>Tarjeta SF Club: −${money(o.discount)}</b> (${esc(o.loyalty?.discountedUnits ?? 1)} prenda${(o.loyalty?.discountedUnits ?? 1) > 1 ? 's' : ''} al ${esc(o.loyalty?.pct ?? 60)} %).
          ${o.loyalty?.verificado ? `Verificado por la base de datos: el cliente tenía <b>${esc(o.loyalty.stampsBefore)}</b> prendas pagadas.` : `Verifica antes de cobrar: el cliente dice tener <b>${esc(o.loyalty?.stampsBefore ?? '?')}</b> prendas.`}</div>` : ''}
        <div class="order__head">
          <span>Total <strong>${money(o.total)}</strong> <span class="muted small">(envío ${money(o.shipping)})</span></span>
          <select class="select" data-ostatus="${esc(o.id)}" aria-label="Estado del pedido">${Object.entries(ORDER_STATUS).map(([k, l]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
      </article>`;
    }).join('')}</div>`;
  }
  app.addEventListener('change', async (e) => {
    if (!e.target.matches('[data-ostatus]')) return;
    try {
      const [saved] = await api(`orders?id=eq.${e.target.dataset.ostatus}`, { method: 'PATCH', body: { status: e.target.value }, prefer: 'return=representation' });
      const o = st.orders.find(x => x.id === saved.id); if (o) Object.assign(o, saved);
      // El inventario pudo cambiar (se descuenta al pagar): se recarga para verlo al día
      st.products = await api('products?select=*&order=sort.asc,created_at.asc');
      toast('Estado actualizado'); render();
    } catch (ex) { toast(ex.message, true); render(); }
  });

  /* ---------------- Consentimientos (prueba para la SIC) ---------------- */
  const PURPOSE = { terminos: 'Términos', privacidad: 'Privacidad', mayoria_edad: 'Mayor de 18', marketing: 'Publicidad por correo', whatsapp: 'Avisos por WhatsApp', cookies_analitica: 'Cookies analítica' };
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
