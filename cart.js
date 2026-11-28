/* =========================================================
   Carrito + favoritos + pedidos.
   El carrito de invitado se fusiona con el del usuario al iniciar sesión.
   ========================================================= */
(function () {
  const listeners = new Set();
  const key = () => { const u = SF.db.kv.get('session'); return u ? 'cart:' + u.userId : 'cart:guest'; };
  const wkey = () => { const u = SF.db.kv.get('session'); return u ? 'wish:' + u.userId : 'wish:guest'; };
  const emit = () => listeners.forEach(fn => fn());

  SF.cart = {
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    items: () => SF.db.kv.get(key(), []),
    save(items) { SF.db.kv.set(key(), items); emit(); },
    count: () => SF.cart.items().reduce((a, i) => a + i.qty, 0),

    add(productId, size, qty = 1) {
      const p = SF.getProduct(productId);
      if (!p || p.status !== 'active') throw new Error('Esta prenda aún no está disponible.');
      if (!size) throw new Error('Elige una talla.');
      const items = SF.cart.items();
      const line = items.find(i => i.productId === productId && i.size === size);
      const max = (p.stock && p.stock[size]) || 10;
      if (line) line.qty = Math.min(max, line.qty + qty); else items.push({ productId, size, qty: Math.min(max, qty) });
      SF.cart.save(items);
      SF.track('add_to_cart', { productId, size, qty });
    },
    setQty(productId, size, qty) {
      let items = SF.cart.items();
      const line = items.find(i => i.productId === productId && i.size === size);
      if (!line) return;
      if (qty <= 0) items = items.filter(i => i !== line); else line.qty = qty;
      SF.cart.save(items);
    },
    remove(productId, size) { SF.cart.save(SF.cart.items().filter(i => !(i.productId === productId && i.size === size))); SF.track('remove_from_cart', { productId, size }); },
    clear() { SF.cart.save([]); },

    detailed() {
      return SF.cart.items().map(i => { const p = SF.getProduct(i.productId); return p ? { ...i, product: p, lineTotal: p.price * i.qty } : null; }).filter(Boolean);
    },
    totals() {
      const subtotal = SF.cart.detailed().reduce((a, l) => a + l.lineTotal, 0);
      const { flat, freeFrom } = SF.config.shipping;
      const shipping = subtotal === 0 || subtotal >= freeFrom ? 0 : flat;
      return { subtotal, shipping, total: subtotal + shipping, freeFrom, missingForFree: Math.max(0, freeFrom - subtotal) };
    },

    mergeGuest() {
      const guest = SF.db.kv.get('cart:guest', []);
      if (guest.length) {
        const items = SF.cart.items();
        guest.forEach(g => { const l = items.find(i => i.productId === g.productId && i.size === g.size); if (l) l.qty += g.qty; else items.push(g); });
        SF.db.kv.del('cart:guest'); SF.cart.save(items);
      }
      const gw = SF.db.kv.get('wish:guest', []);
      if (gw.length) { SF.db.kv.set(wkey(), [...new Set([...SF.wish.list(), ...gw])]); SF.db.kv.del('wish:guest'); }
      emit();
    },
  };

  SF.wish = {
    list: () => SF.db.kv.get(wkey(), []),
    has: (id) => SF.wish.list().includes(id),
    toggle(id) {
      const l = SF.wish.list(); const on = !l.includes(id);
      SF.db.kv.set(wkey(), on ? [...l, id] : l.filter(x => x !== id));
      SF.track(on ? 'wishlist_add' : 'wishlist_remove', { productId: id }); emit(); return on;
    },
  };

  SF.orders = {
    // Crea el pedido en estado "pendiente de pago". La pasarela de pago
    // (Wompi / Mercado Pago / PayU / Stripe…) se conectará en este punto.
    async create({ customer, address, notes }) {
      const lines = SF.cart.detailed(); if (!lines.length) throw new Error('Tu carrito está vacío.');
      const t = SF.cart.totals(); const u = SF.auth.user();
      const draft = {
        // Número único aunque compren varias personas a la vez (antes era un contador local)
        number: 'SF-' + Date.now().toString(36).toUpperCase().slice(-6),
        userId: u ? u.id : null, customer, address, notes,
        items: lines.map(l => ({ productId: l.productId, name: l.product.name, size: l.size, qty: l.qty, unitPrice: l.product.price })),
        subtotal: t.subtotal, shipping: t.shipping, total: t.total, currency: SF.config.currency.code,
        status: 'pending_payment', paymentProvider: null,
      };
      // Primero la base de datos (valida precios y stock); si lo rechaza, el carrito no se toca
      const saved = SF.remote ? await SF.remote.saveOrder(draft) : { ok: true };
      if (!saved.ok) { SF.remote.refresh(); throw new Error(saved.error); }
      const order = SF.db.insert('orders', draft);
      SF.track('checkout_order_created', { orderId: order.id, total: order.total });
      SF.cart.clear(); return order;
    },
    mine() { const u = SF.auth.user(); return u ? SF.db.where('orders', o => o.userId === u.id).reverse() : []; },
  };
})();
