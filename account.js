/* =========================================================
   Mi cuenta: perfil, pedidos, favoritos, cerrar sesión.
   Favoritos también funcionan para invitados.
   ========================================================= */
(function () {
  const { $, $$, esc, icon } = SF;
  SF.mountStylePanel();
  SF.mountLayout();
  const root = $('[data-account-page]');
  const statusTxt = { pending_payment: 'Pendiente de pago', paid: 'Pagado', shipped: 'Enviado', delivered: 'Entregado', cancelled: 'Cancelado' };

  function tabFromHash() { return (location.hash || '#perfil').slice(1); }

  function favs() {
    const list = SF.wish.list().map(SF.getProduct).filter(Boolean);
    if (!list.length) return `<div class="empty"><div class="empty__icon">${icon.heart}</div><p>Aún no guardas prendas.</p><a class="btn btn--ghost" href="index.html#tienda">Explorar</a></div>`;
    return `<div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">${list.map(p => `
      <article class="card"><a class="card__media" href="producto.html?id=${p.id}"><img src="${p.images[0]}" alt="${esc(p.name)}"></a>
      <button class="icon-btn card__wish is-on" data-wish="${p.id}" aria-pressed="true" aria-label="Quitar de favoritos">${icon.heart}</button>
      <div class="card__info"><a class="card__name" href="producto.html?id=${p.id}">${esc(p.name)}</a><span class="card__price">${SF.money(p.price)}</span></div></article>`).join('')}</div>`;
  }

  function render() {
    const u = SF.auth.user(); const tab = tabFromHash();
    if (!u) {
      root.innerHTML = `
        <div class="page-head"><span class="eyebrow">Mi cuenta</span><h1 class="display h-m mt-1">Hola, <span class="serif">bienvenid@</span></h1></div>
        <div class="account">
          <div class="panel" style="grid-column:1/-1;display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap">
            <p style="margin:0;max-width:520px">Inicia sesión o crea tu cuenta para ver tus pedidos, guardar direcciones y recibir acceso anticipado a cada drop.</p>
            <div style="display:flex;gap:10px"><button class="btn btn--accent" data-a="register">Crear cuenta</button><button class="btn btn--ghost" data-a="login">Iniciar sesión</button></div>
          </div>
          ${tab === 'favoritos' ? `<div style="grid-column:1/-1"><h2 class="display" style="font-size:24px;margin:24px 0 18px">Tus favoritos</h2>${favs()}</div>` : ''}
        </div>`;
      $$('[data-a]').forEach(b => b.addEventListener('click', () => SF.openAuth(b.dataset.a)));
      return;
    }
    const orders = SF.orders.mine(); const a = u.address || {};
    const panes = {
      perfil: `
        <div class="panel"><h2>Datos personales</h2>
          <form class="form" data-profile>
            <label>Nombre<input name="name" value="${esc(u.name)}" required></label>
            <div class="form-row"><label>Correo<input value="${esc(u.email)}" disabled></label><label>Celular<input name="phone" type="tel" value="${esc(u.phone || '')}"></label></div>
            <div class="form-row"><label>Cumpleaños<input name="birthdate" type="date" value="${esc(u.birthdate || '')}"></label><span></span></div>
            <label class="check"><input type="checkbox" name="marketing" ${u.marketing ? 'checked' : ''}> Recibir novedades y descuentos</label>
            <button class="btn btn--accent" style="justify-self:start">Guardar cambios</button>
          </form>
        </div>
        <div class="panel"><h2>Dirección guardada</h2><p class="muted" style="margin:0">${a.line1 ? esc([a.line1, a.line2, a.city, a.region].filter(Boolean).join(', ')) : 'Aún no tienes una dirección. Se guardará en tu próxima compra.'}</p></div>`,
      pedidos: `<div class="panel"><h2>Mis pedidos</h2>${orders.length ? orders.map(o => `
          <div class="order"><div><strong>${esc(o.number)}</strong> <span class="muted">· ${new Date(o.createdAt).toLocaleDateString('es')}</span><br><span class="muted">${o.items.map(i => `${esc(i.name)} (${esc(i.size)}) x${i.qty}`).join(', ')}</span></div>
          <div style="text-align:right"><strong>${SF.money(o.total)}</strong><br><span class="status">${statusTxt[o.status] || o.status}</span></div></div>`).join('')
        : `<div class="empty"><div class="empty__icon">${icon.bag}</div><p>Todavía no tienes pedidos.</p><a class="btn btn--ghost" href="index.html#tienda">Ir a la tienda</a></div>`}</div>`,
      favoritos: `<div class="panel"><h2>Favoritos</h2>${favs()}</div>`,
    };
    root.innerHTML = `
      <div class="page-head"><span class="eyebrow">Mi cuenta</span><h1 class="display h-m mt-1">Hola, <span class="serif">${esc(u.name.split(' ')[0])}</span></h1></div>
      <div class="account">
        <nav class="acc-nav" aria-label="Secciones de la cuenta">
          <button data-tab="perfil" class="${tab === 'perfil' ? 'is-on' : ''}">Perfil</button>
          <button data-tab="pedidos" class="${tab === 'pedidos' ? 'is-on' : ''}">Pedidos (${orders.length})</button>
          <button data-tab="favoritos" class="${tab === 'favoritos' ? 'is-on' : ''}">Favoritos (${SF.wish.list().length})</button>
          <button data-logout>Cerrar sesión</button>
        </nav>
        <div>${panes[tab] || panes.perfil}</div>
      </div>`;
    $$('[data-tab]').forEach(b => b.addEventListener('click', () => { location.hash = b.dataset.tab; }));
    $('[data-logout]').addEventListener('click', () => { SF.auth.logout(); SF.toast('Sesión cerrada'); location.hash = ''; render(); });
    $('[data-profile]')?.addEventListener('submit', (e) => {
      e.preventDefault(); const f = e.target;
      SF.auth.updateProfile({ name: f.name.value.trim() || u.name, phone: f.phone.value, birthdate: f.birthdate.value, marketing: f.marketing.checked });
      SF.toast('Datos guardados ✓');
    });
  }

  addEventListener('hashchange', render);
  SF.auth.onChange(render);
  SF.cart.onChange(() => { if (tabFromHash() === 'favoritos') render(); });
  render();
})();
