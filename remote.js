/* =========================================================
   Conexión con la base de datos (Supabase) para la tienda pública.
   - Inventario: se lee de la tabla `products`. La página se pinta de inmediato
     con la última copia guardada y, si la base de datos trae cambios, se
     vuelve a pintar sola (evento "sf:catalog").
   - Pedidos: se guardan también en la tabla `orders` para verlos en el panel.
   Si Supabase no está configurado o falla, la tienda sigue con
   products.js (nunca se queda en blanco).
   ========================================================= */
(function () {
  const cfg = SF.config.supabase || {};
  const enabled = !!(cfg.url && cfg.anonKey);
  const CACHE = 'catalogCache';

  const rest = (path, opts = {}) => fetch(`${cfg.url}/rest/v1/${path}`, {
    ...opts,
    headers: { apikey: cfg.anonKey, Authorization: `Bearer ${cfg.anonKey}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });

  // Fila de la base de datos → misma forma que usa toda la web (products.js)
  const fromRow = (r) => ({
    id: r.id, slug: r.slug, name: r.name, drop: r.drop_name || '', category: r.category, gender: r.gender,
    price: r.price, compareAt: r.compare_at,
    colors: r.colors?.length ? r.colors : [{ name: '', hex: '#2B2D31' }],
    sizes: r.sizes || [], stock: r.stock || {}, images: r.images || [], badges: r.badges || [],
    status: r.status, description: r.description || '', features: r.features || [],
    featured: !!r.featured, createdAt: r.created_at,
  });

  // Reemplaza el contenido de SF.catalog / SF.categories sin cambiar las referencias
  function apply({ products, categories }) {
    SF.catalog.splice(0, SF.catalog.length, ...products);
    if (categories?.length) SF.categories.splice(0, SF.categories.length, ...categories);
  }

  // 1) Al cargar: aplicar la última copia conocida (pinta rápido y sin saltos)
  const cached = enabled ? SF.db.kv.get(CACHE) : null;
  if (cached?.products?.length) apply(cached);

  // 2) Traer lo último de la base de datos
  let last = cached ? JSON.stringify(cached) : '', busy = false, lastAt = 0;
  async function refresh() {
    if (!enabled || busy) return;
    busy = true; lastAt = Date.now();
    try {
      const [pr, cr] = await Promise.all([
        rest('products?select=*&status=in.(active,coming_soon)&order=sort.asc,created_at.asc'),
        rest('categories?select=id,label&order=sort.asc'),
      ]);
      if (!pr.ok) throw new Error('products ' + pr.status);
      const data = { products: (await pr.json()).map(fromRow), categories: cr.ok ? await cr.json() : [] };
      const json = JSON.stringify(data);
      if (json !== last) {
        last = json; SF.db.kv.set(CACHE, data); apply(data);
        dispatchEvent(new CustomEvent('sf:catalog'));
      }
    } catch (e) { console.warn('[SF] Catálogo sin conexión, uso la copia local:', e.message); }
    finally { busy = false; }
  }

  // Al volver a la pestaña también se revisa (máx. una vez cada 20 s)
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - lastAt > 20000) refresh(); });

  SF.remote = {
    enabled,
    ready: refresh(),
    refresh,
    // Guarda el pedido en la base de datos (las reglas solo permiten crearlo, no leerlo).
    // La base de datos revisa precios y stock; si algo no cuadra, devuelve el motivo.
    async saveOrder(o) {
      if (!enabled) return { ok: true, offline: true };
      try {
        const r = await rest('orders', {
          method: 'POST', headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            number: o.number, customer: o.customer, address: o.address || null, notes: o.notes || null,
            items: o.items, subtotal: o.subtotal, shipping: o.shipping, total: o.total, currency: o.currency,
            status: 'pending_payment',
          }),
        });
        if (r.ok) return { ok: true };
        const j = await r.json().catch(() => ({}));
        return { ok: false, error: j.message || 'No pudimos registrar el pedido.' };
      } catch { return { ok: false, error: 'Sin conexión. Revisa tu internet e intenta de nuevo.' }; }
    },
  };
})();
