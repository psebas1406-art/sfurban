/* =========================================================
   Cuentas de clientes con Supabase Auth (servidor real).
   - Las contraseñas las guarda y verifica Supabase (nunca la tienda).
   - El perfil vive en la tabla `customers`; los pedidos en `orders` (cada
     cliente ve solo los suyos gracias a RLS).
   - Misma interfaz de antes (SF.auth.user/register/login/...), así el resto
     del sitio no cambia. user() es síncrono: devuelve el perfil en caché.
   ========================================================= */
(function () {
  const cfg = SF.config.supabase || {};
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => { try { fn(SF.auth.user()); } catch (e) { console.error(e); } });
  const K = { session: 'sb-session', profile: 'sb-profile', orders: 'sb-orders' };
  SF.db.kv.del('session'); // sesión del modo demo anterior (ya no se usa)

  const authHeaders = { apikey: cfg.anonKey, 'Content-Type': 'application/json' };
  const site = () => location.origin + location.pathname.replace(/[^/]*$/, '') + 'index.html';

  // Traduce los errores de Supabase a mensajes claros
  function niceError(j, fallback) {
    const m = String(j?.msg || j?.message || j?.error_description || j?.error || '');
    if (/already registered|already exists/i.test(m)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
    if (/invalid login credentials/i.test(m)) return 'Correo o contraseña incorrectos.';
    if (/email not confirmed/i.test(m)) return 'Primero confirma tu correo: te enviamos un enlace al registrarte.';
    if (/rate limit|too many/i.test(m)) return 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
    if (/password/i.test(m) && /(weak|short|least)/i.test(m)) return 'La contraseña es muy débil: usa al menos 8 caracteres con letras y números.';
    if (/signups not allowed/i.test(m)) return 'El registro está cerrado por ahora.';
    return fallback || m || 'Algo salió mal. Inténtalo de nuevo.';
  }

  /* ---------------- Sesión ---------------- */
  const getSession = () => SF.db.kv.get(K.session);
  function saveSession(j) {
    SF.db.kv.set(K.session, {
      access_token: j.access_token, refresh_token: j.refresh_token,
      expires_at: Date.now() + ((+j.expires_in || 3600) - 60) * 1000,
      user: { id: j.user?.id, email: j.user?.email },
    });
  }
  function clearLocal() { [K.session, K.profile, K.orders].forEach(k => SF.db.kv.del(k)); }

  let refreshing = null;
  async function token() {
    const s = getSession(); if (!s) return null;
    if (Date.now() < s.expires_at) return s.access_token;
    refreshing = refreshing || (async () => {
      try {
        const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ refresh_token: s.refresh_token }) });
        const j = await r.json();
        if (!r.ok) throw j;
        saveSession(j); return j.access_token;
      } catch { clearLocal(); emit(); return null; }
      finally { setTimeout(() => { refreshing = null; }, 0); }
    })();
    return refreshing;
  }

  // Llamada a la base de datos como el cliente (RLS aplica sus permisos)
  async function api(path, { method = 'GET', body, prefer } = {}) {
    const t = await token(); if (!t) throw new Error('Tu sesión expiró. Inicia sesión de nuevo.');
    const r = await fetch(`${cfg.url}/rest/v1/${path}`, {
      method, headers: { ...authHeaders, Authorization: `Bearer ${t}`, ...(prefer ? { Prefer: prefer } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error(niceError(j)); }
    return r.status === 204 ? null : r.json().catch(() => null);
  }

  /* ---------------- Perfil y pedidos (caché local) ---------------- */
  const fromProfile = (c) => c && ({ id: c.id, email: c.email, name: c.name, phone: c.phone || '', address: c.address || null, marketing: !!c.marketing, createdAt: c.created_at });
  const fromOrder = (o) => ({
    id: o.id, number: o.number, userId: o.user_id, customer: o.customer, address: o.address, notes: o.notes,
    items: o.items || [], subtotal: o.subtotal, discount: o.discount || 0, shipping: o.shipping, total: o.total,
    currency: o.currency, status: o.status, loyalty: o.loyalty, createdAt: o.created_at,
  });
  async function loadProfile() {
    const s = getSession(); if (!s) return null;
    const rows = await api(`customers?id=eq.${s.user.id}&select=*`);
    const p = fromProfile(rows?.[0]) || { id: s.user.id, email: s.user.email, name: '', marketing: false };
    SF.db.kv.set(K.profile, p); return p;
  }
  async function loadOrders() {
    const s = getSession(); if (!s) return [];
    const rows = await api(`orders?user_id=eq.${s.user.id}&select=*&order=created_at.desc&limit=200`);
    const list = (rows || []).map(fromOrder); SF.db.kv.set(K.orders, list); return list;
  }
  async function afterLogin() {
    try { await Promise.all([loadProfile(), loadOrders()]); } catch (e) { console.warn('[auth]', e.message); }
    SF.cart?.mergeGuest?.();
    emit();
  }

  /* ---------------- Enlaces del correo (confirmar cuenta / cambiar contraseña) ---------------- */
  (function readEmailLink() {
    if (!/access_token=|error_description=/.test(location.hash)) return;
    const h = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname + location.search + '#perfil');
    if (h.get('error_description')) { SF.db.kv.set('authNotice', 'El enlace ya no es válido o expiró. Pide uno nuevo.'); return; }
    saveSession({ access_token: h.get('access_token'), refresh_token: h.get('refresh_token'), expires_in: h.get('expires_in'), user: {} });
    try { // el id y el correo vienen dentro del token
      const claims = JSON.parse(atob(h.get('access_token').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const s = getSession(); s.user = { id: claims.sub, email: claims.email }; SF.db.kv.set(K.session, s);
    } catch {}
    if (h.get('type') === 'recovery') SF.db.kv.set('authNotice', 'recovery');
    else SF.db.kv.set('authNotice', '¡Correo confirmado! Ya tienes tu cuenta SF Club.');
    afterLogin();
  })();

  SF.auth = {
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    token,
    api,

    user() {
      const s = getSession(); if (!s) return null;
      return SF.db.kv.get(K.profile) || { id: s.user?.id, email: s.user?.email, name: '' };
    },

    // Datos mínimos: solo nombre, correo y contraseña.
    async register({ name, email, password, terms, privacy, adult, marketing = false }) {
      name = (name || '').trim(); email = (email || '').trim().toLowerCase();
      if (name.length < 2) throw new Error('Escribe tu nombre.');
      if (!emailOk(email)) throw new Error('Ese correo no parece válido.');
      if ((password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      if (!terms) throw new Error('Para crear la cuenta debes aceptar los Términos y condiciones.');
      if (!privacy) throw new Error('Para crear la cuenta debes autorizar el tratamiento de datos (Política de privacidad).');
      if (!adult) throw new Error('Debes ser mayor de 18 años para crear una cuenta.');
      const r = await fetch(`${cfg.url}/auth/v1/signup?redirect_to=${encodeURIComponent(site())}`, {
        method: 'POST', headers: authHeaders,
        body: JSON.stringify({ email, password, data: { name: name.slice(0, 80), marketing: !!marketing } }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(niceError(j, 'No se pudo crear la cuenta.'));
      const userId = j.user?.id || j.id;
      // Supabase no revela si el correo ya existía cuando pide confirmación (respuesta sin identidades)
      if (!j.access_token && Array.isArray(j.identities) && j.identities.length === 0) throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
      // Prueba de la autorización: cada casilla por separado
      await SF.consent.record({
        form: 'registro', email, userId,
        items: [
          { purpose: 'terminos', granted: true }, { purpose: 'privacidad', granted: true },
          { purpose: 'mayoria_edad', granted: true }, { purpose: 'marketing', granted: !!marketing },
        ],
      });
      SF.track('sign_up', { method: 'email' });
      if (!j.access_token) return { name, email, pending: true }; // debe confirmar el correo
      saveSession(j);
      SF.db.kv.set(K.profile, { id: userId, email, name, marketing: !!marketing, phone: '', address: null, createdAt: new Date().toISOString() });
      await afterLogin();
      return SF.auth.user();
    },

    async login({ email, password }) {
      email = (email || '').trim().toLowerCase();
      if (!emailOk(email) || !password) throw new Error('Escribe tu correo y tu contraseña.');
      const r = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ email, password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(niceError(j, 'Correo o contraseña incorrectos.'));
      saveSession(j);
      api('rpc/registrar_inicio_sesion', { method: 'POST', body: {} }).catch(() => {});
      await afterLogin();
      SF.track('login');
      return SF.auth.user();
    },

    async logout() {
      const t = getSession()?.access_token;
      SF.track('logout');
      clearLocal(); emit();
      if (t) fetch(`${cfg.url}/auth/v1/logout`, { method: 'POST', headers: { ...authHeaders, Authorization: `Bearer ${t}` } }).catch(() => {});
    },

    // Guarda al instante en este dispositivo y luego en la base de datos
    updateProfile(patch) {
      const u = SF.auth.user(); if (!u) return null;
      const allowed = ['name', 'phone', 'address'];
      const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
      SF.db.kv.set(K.profile, { ...u, ...clean }); emit();
      api(`customers?id=eq.${u.id}`, { method: 'PATCH', body: clean }).catch(e => SF.toast?.(e.message, 'err'));
      return SF.auth.user();
    },

    /** Autorizar o retirar el envío de publicidad (queda registrado). */
    async setMarketing(on) {
      const u = SF.auth.user(); if (!u) return;
      SF.db.kv.set(K.profile, { ...u, marketing: !!on });
      await api(`customers?id=eq.${u.id}`, { method: 'PATCH', body: { marketing: !!on } }).catch(() => {});
      await SF.consent.record({ form: 'perfil', method: 'interruptor en el perfil', email: u.email, userId: u.id, items: [{ purpose: 'marketing', granted: !!on }] });
      emit();
    },

    /** Copia de todos los datos que la tienda tiene de esta persona (derecho de acceso). */
    exportData() {
      const u = SF.auth.user(); if (!u) return null;
      return { generado: new Date().toISOString(), cuenta: u, pedidos: SF.orders.mine(), favoritos: SF.wish.list(), consentimientos: SF.consent.history(u.email) };
    },

    /** Supresión: borra la cuenta en el servidor. Los pedidos se conservan sin vínculo
        (obligación contable) y los registros de consentimiento se conservan (prueba legal). */
    async deleteAccount() {
      const u = SF.auth.user(); if (!u) return;
      await SF.consent.record({ form: 'perfil', method: 'botón eliminar cuenta', email: u.email, userId: u.id, items: [{ purpose: 'privacidad', granted: false }, { purpose: 'marketing', granted: false }] });
      await api('rpc/eliminar_mi_cuenta', { method: 'POST', body: {} });
      SF.db.kv.del('cart:' + u.id); SF.db.kv.del('wish:' + u.id);
      clearLocal(); emit();
    },

    async requestReset(email) {
      email = (email || '').trim().toLowerCase();
      if (!emailOk(email)) throw new Error('Escribe un correo válido.');
      const r = await fetch(`${cfg.url}/auth/v1/recover?redirect_to=${encodeURIComponent(site())}`, { method: 'POST', headers: authHeaders, body: JSON.stringify({ email }) });
      if (!r.ok && r.status === 429) throw new Error('Demasiados intentos. Espera unos minutos.');
      SF.track('password_reset_requested');
      return true;
    },

    async setNewPassword(password) {
      if ((password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      const t = await token(); if (!t) throw new Error('El enlace expiró. Pide uno nuevo.');
      const r = await fetch(`${cfg.url}/auth/v1/user`, { method: 'PUT', headers: { ...authHeaders, Authorization: `Bearer ${t}` }, body: JSON.stringify({ password }) });
      if (!r.ok) throw new Error(niceError(await r.json().catch(() => ({}))));
      return true;
    },

    // Pedidos del cliente desde la base de datos (para el perfil y la tarjeta de fidelidad)
    myOrders: () => SF.db.kv.get(K.orders, []),
    refreshOrders: () => loadOrders().then(l => { emit(); return l; }).catch(() => SF.auth.myOrders()),
  };

  // Al abrir la página con sesión: actualizar perfil y pedidos en segundo plano
  if (getSession()) afterLogin();
})();
