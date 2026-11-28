/* =========================================================
   Checkout: datos de contacto + dirección + resumen.
   El pedido se crea en estado "pendiente de pago".
   PUNTO DE INTEGRACIÓN DE PAGOS: ver comentario en onSubmit.
   ========================================================= */
(function () {
  const { $, esc, icon } = SF;
  SF.mountStylePanel();
  SF.mountLayout();
  const root = $('[data-checkout]');

  function render() {
    const lines = SF.cart.detailed();
    if (!lines.length) {
      root.innerHTML = `<div class="success" style="padding-top:calc(var(--header-h) + 80px)"><div class="empty__icon">${icon.cart}</div><h1 class="display h-m">Tu carrito está <span class="serif">vacío</span></h1><a class="btn btn--accent" href="index.html#explorar">Explorar ${icon.arrow}</a></div>`;
      return;
    }
    const u = SF.auth.user() || {}; const a = u.address || {}; const t = SF.cart.totals();
    root.innerHTML = `
      <div class="page-head"><span class="eyebrow">Paso final</span><h1 class="display h-m mt-1">${SF.auth.nick() ? `Ya casi es tuyo, <span class="serif">${esc(SF.auth.nick())}</span>` : 'Finalizar <span class="serif">compra</span>'}</h1></div>
      <div class="checkout">
        <form class="form" data-form novalidate>
          ${u.id ? '' : `<div class="notice">¿Ya tienes cuenta? <button type="button" class="link-btn" data-login>Inicia sesión</button> para guardar tu pedido y tus datos.</div>`}
          <div class="panel">
            <h2><i>1</i>Contacto</h2>
            <div class="form" style="gap:12px">
              <label>Nombre completo<input name="name" autocomplete="name" value="${esc(u.name || '')}" required></label>
              <div class="form-row">
                <label>Correo<input name="email" type="email" autocomplete="email" value="${esc(u.email || '')}" required></label>
                <label>Celular<input name="phone" type="tel" autocomplete="tel" value="${esc(u.phone || '')}" required></label>
              </div>
            </div>
          </div>
          <div class="panel">
            <h2><i>2</i>Envío</h2>
            <div class="form" style="gap:12px">
              <label>Dirección<input name="line1" autocomplete="address-line1" value="${esc(a.line1 || '')}" required></label>
              <label>Apartamento, barrio, referencias <span class="muted">(opcional)</span><input name="line2" autocomplete="address-line2" value="${esc(a.line2 || '')}"></label>
              <div class="form-row">
                <label>Ciudad<input name="city" autocomplete="address-level2" value="${esc(a.city || '')}" required></label>
                <label>Departamento / Estado<input name="region" autocomplete="address-level1" value="${esc(a.region || '')}" required></label>
              </div>
              <label>Notas del pedido <span class="muted">(opcional)</span><textarea name="notes"></textarea></label>
              ${u.id ? '<label class="check"><input type="checkbox" name="save"> Guardar esta dirección en mi cuenta para próximas compras (opcional)</label>' : ''}
              <p class="legal-note">Usamos estos datos solo para entregarte el pedido y contactarte sobre él.</p>
            </div>
          </div>
          <div class="panel">
            <h2><i>3</i>Pago</h2>
            <div class="pay-opts">
              <div class="pay-opt">💳 Tarjeta crédito / débito<small>Próximamente</small></div>
              <div class="pay-opt">🏦 PSE / transferencia<small>Próximamente</small></div>
              <div class="pay-opt">📱 Billeteras digitales<small>Próximamente</small></div>
              <div class="pay-opt">💬 Coordinar por WhatsApp<small>Próximamente</small></div>
            </div>
            <p class="notice" style="margin-top:14px">Los pagos en línea se activarán pronto. Por ahora tu pedido queda <strong>reservado</strong> y te contactamos para completarlo.</p>
          </div>
          <div class="panel">
            <h2><i>4</i>Confirmación</h2>
            <p class="notice notice--soft">Tienes <strong>5 días hábiles</strong> desde que recibes tu pedido para retractarte de la compra (Ley 1480 de 2011, art. 47), además de la garantía legal. Detalles en <a href="${SF.config.legal.docs.reembolsos}" target="_blank" rel="noopener">Cambios, devoluciones y reembolsos</a>.</p>
            <div class="form" style="gap:10px;margin-top:12px">${SF.legalChecks()}</div>
          </div>
          <p class="form-error" data-error></p>
          <button class="btn btn--accent btn--block" type="submit">Reservar pedido · ${SF.money(t.total)}</button>
        </form>

        <aside class="panel summary">
          <h2>Resumen</h2>
          ${lines.map(l => `
          <div class="cart-line" style="grid-template-columns:64px 1fr auto">
            <div class="cart-line__img"><img src="${l.product.images[0]}" alt=""></div>
            <div class="cart-line__info"><span class="cart-line__name">${esc(l.product.name)}</span><span class="muted">Talla ${esc(l.size)} · x${l.qty}</span></div>
            <strong>${SF.money(l.lineTotal)}</strong>
          </div>`).join('')}
          <div style="display:grid;gap:8px;margin-top:16px">
            <div class="sum-row"><span>Subtotal</span><span>${SF.money(t.subtotal)}</span></div>
            ${t.discount ? `<div class="sum-row sum-row--loyal"><span>${SF.isoSVG} Tarjeta SF Club · 60%</span><span>−${SF.money(t.discount)}</span></div>` : ''}
            <div class="sum-row muted"><span>Envío</span><span>${t.shipping ? SF.money(t.shipping) : 'Gratis'}</span></div>
            <div class="sum-row sum-row--total"><span>Total</span><span>${SF.money(t.total)}</span></div>
            <p class="legal-note">Precios en pesos colombianos (COP), con impuestos incluidos. El total es lo único que pagas.</p>
          </div>
        </aside>
      </div>`;
    $('[data-login]')?.addEventListener('click', () => SF.openAuth('login'));
    $('[data-form]').addEventListener('submit', onSubmit);
  }

  async function onSubmit(e) {
    e.preventDefault(); const f = e.target; const err = $('[data-error]'); err.textContent = '';
    const bad = [...f.querySelectorAll('input[required]:not([type=checkbox]), textarea[required]')].find(i => !i.value.trim());
    if (bad) { err.textContent = 'Completa los campos obligatorios.'; bad.focus(); return; }
    const d = Object.fromEntries(new FormData(f));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) { err.textContent = 'Revisa el correo.'; f.email.focus(); return; }
    if (!f.c_terminos.checked) { err.textContent = 'Para reservar debes aceptar los Términos y condiciones.'; f.c_terminos.focus(); return; }
    if (!f.c_privacidad.checked) { err.textContent = 'Para reservar debes autorizar el tratamiento de tus datos (Política de privacidad).'; f.c_privacidad.focus(); return; }
    if (!f.c_mayoria_edad.checked) { err.textContent = 'Debes ser mayor de 18 años para comprar.'; f.c_mayoria_edad.focus(); return; }
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    const u0 = SF.auth.user();
    // Prueba de la autorización, ligada al correo del pedido
    await SF.consent.record({
      form: 'checkout', email: d.email.trim().toLowerCase(), userId: u0?.id || null,
      items: [{ purpose: 'terminos', granted: true }, { purpose: 'privacidad', granted: true }, { purpose: 'mayoria_edad', granted: true }],
    });
    const address = { line1: d.line1, line2: d.line2, city: d.city, region: d.region };
    if (d.save && u0) SF.auth.updateProfile({ address, phone: d.phone });

    // ▶ AQUÍ se conectará la pasarela de pagos:
    //   1) crear pedido en el servidor  2) crear sesión de pago  3) redirigir al proveedor
    //   4) webhook del proveedor actualiza el estado del pedido a "paid".
    let order;
    try { order = await SF.orders.create({ customer: { name: d.name, email: d.email, phone: d.phone }, address, notes: d.notes }); }
    catch (ex) { err.textContent = ex.message; btn.disabled = false; return; }
    root.innerHTML = `
      <div class="success" style="padding-top:calc(var(--header-h) + 60px)">
        <div class="success__check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>
        <span class="eyebrow">Pedido ${esc(order.number)}</span>
        <h1 class="display h-m">¡Gracias, <span class="serif">${esc(SF.auth.nick() || d.name.split(' ')[0])}</span>!</h1>
        <p class="muted" style="max-width:480px">Tu pedido quedó reservado por ${SF.money(order.total)}. Te escribiremos a ${esc(d.email)} para coordinar el pago y el envío.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center">
          ${SF.auth.user() ? `<a class="btn btn--accent" href="index.html#perfil">Ver mis pedidos</a>` : `<button class="btn btn--accent" data-reg>Crear cuenta para seguir tu pedido</button>`}
          <a class="btn btn--ghost" href="index.html#inicio">Volver al inicio</a>
        </div>
      </div>`;
    $('[data-reg]')?.addEventListener('click', () => SF.openAuth('register'));
    scrollTo({ top: 0, behavior: 'smooth' });
  }

  render();
  SF.auth.onChange(() => { if ($('[data-form]')) render(); });
})();
