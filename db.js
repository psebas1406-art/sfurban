/* =========================================================
   Capa de datos (adaptador).
   HOY: guarda en localStorage del navegador (modo demo, sin servidor).
   MAÑANA: se reemplaza este archivo por uno que llame a la API/base
   de datos real (p.ej. Supabase/PostgreSQL) con la MISMA interfaz:
     SF.db.all(table) · get(table,id) · insert(table,row) · update(table,id,patch) · remove(table,id) · where(table,fn)
   Las tablas reflejan db/schema.sql: users, orders, wishlist, events, newsletter.
   ========================================================= */
(function () {
  const PREFIX = 'sfurban:';
  const read = (t) => { try { return JSON.parse(localStorage.getItem(PREFIX + t)) || []; } catch { return []; } };
  const write = (t, rows) => { try { localStorage.setItem(PREFIX + t, JSON.stringify(rows)); } catch (e) { console.warn('No se pudo guardar', e); } };
  const uid = (p) => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  SF.db = {
    uid,
    all: (t) => read(t),
    get: (t, id) => read(t).find(r => r.id === id) || null,
    where: (t, fn) => read(t).filter(fn),
    insert(t, row) {
      const rows = read(t);
      const rec = { id: row.id || uid(t.slice(0, 3)), createdAt: new Date().toISOString(), ...row };
      rows.push(rec); write(t, rows); return rec;
    },
    update(t, id, patch) {
      const rows = read(t); const i = rows.findIndex(r => r.id === id);
      if (i < 0) return null; rows[i] = { ...rows[i], ...patch, updatedAt: new Date().toISOString() };
      write(t, rows); return rows[i];
    },
    remove(t, id) { write(t, read(t).filter(r => r.id !== id)); },
    // Clave/valor simple (sesión, carrito invitado, preferencias)
    kv: {
      get: (k, d = null) => { try { const v = localStorage.getItem(PREFIX + 'kv:' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
      set: (k, v) => { try { localStorage.setItem(PREFIX + 'kv:' + k, JSON.stringify(v)); } catch {} },
      del: (k) => { try { localStorage.removeItem(PREFIX + 'kv:' + k); } catch {} },
    },
  };

  /* Analítica propia → tabla `events` de la base de datos (la ve el panel privado).
     Es OPCIONAL: solo se mide si la persona lo aceptó en el aviso de cookies.
     Los eventos se envían en grupos para no hacer una llamada por cada clic. */
  let queue = [], timer = null;
  async function flush(useBeacon) {
    clearTimeout(timer); timer = null;
    const cfg = SF.config.supabase || {};
    if (!queue.length || !cfg.url) return;
    const batch = queue.splice(0, 50);
    let bearer = cfg.anonKey;
    const u = SF.auth?.user();
    if (u) { try { bearer = (await SF.auth.token()) || cfg.anonKey; } catch {} }
    const rows = batch.map(e => ({ ...e, user_id: bearer === cfg.anonKey ? null : e.user_id }));
    try {
      await fetch(`${cfg.url}/rest/v1/events`, {
        method: 'POST', keepalive: !!useBeacon,
        headers: { apikey: cfg.anonKey, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify(rows),
      });
    } catch {}
  }
  addEventListener('pagehide', () => flush(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(true); });

  SF.track = (type, data = {}) => {
    if (!(SF.consent && SF.consent.cookies.analytics())) return;
    const u = SF.auth?.user();
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && String(v).length < 200));
    queue.push({ type: String(type).slice(0, 40), path: (location.pathname + location.hash).slice(0, 200), data: clean, user_id: u ? u.id : null, anon_id: SF.consent.anonId?.() || null });
    if (queue.length >= 20) flush(); else if (!timer) timer = setTimeout(flush, 4000);
  };
})();
