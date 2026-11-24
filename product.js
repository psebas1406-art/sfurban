/* =========================================================
   Página de producto: galería con zoom, tallas con stock,
   añadir a la bolsa, favoritos, detalles y barra fija en móvil.
   ========================================================= */
(function () {
  const { $, $$, esc, icon } = SF;
  SF.mountStylePanel();
  SF.mountLayout();

  const id = new URLSearchParams(location.search).get('id') || 'p-0001';
  const p = SF.getProduct(id);
  const root = $('[data-pdp]');

  if (!p || p.status !== 'active') {
    root.innerHTML = `<div class="success" style="padding-top:calc(var(--header-h) + 80px)"><h1 class="display h-m">Esta prenda <span class="serif">aún no llega</span></h1><p class="muted">Estamos preparando nuevas piezas. Mientras tanto, mira lo que ya está disponible.</p><a class="btn btn--accent" href="index.html#tienda">Ir a la tienda ${icon.arrow}</a></div>`;
    return;
  }
  document.title = `${p.name} — SF Urban`;
  SF.track('product_view', { productId: p.id });

  let size = null;
  const wish = SF.wish.has(p.id);
  root.innerHTML = `
  <div class="pdp">
    <div class="pdp__gallery" data-zoom aria-label="Imagen del producto. Haz clic para ampliar.">
      <div class="ring" aria-hidden="true"></div>
      <img src="${p.images[0]}" alt="${esc(p.name)}">
    </div>
    <div class="pdp__info">
      <nav class="crumbs" aria-label="Migas de pan"><a href="index.html">Inicio</a> / <a href="index.html#tienda">Tienda</a> / <span>${esc(p.name)}</span></nav>
      <div class="card__badges" style="position:static;margin-bottom:14px">${p.badges.map((b, k) => `<span class="tag ${k ? '' : 'tag--accent'}">${esc(b)}</span>`).join('')}</div>
      <h1 class="display">${esc(p.name)}</h1>
      <div class="pdp__price">${SF.money(p.price)}${p.compareAt ? ` <s class="muted" style="font-size:.6em">${SF.money(p.compareAt)}</s>` : ''}</div>
      <p class="muted">${esc(p.drop)} · <span class="swatch" style="background:${p.colors[0].hex}"></span>${esc(p.colors[0].name)}</p>
      <p>${esc(p.description)}</p>

      <div class="pdp__opt"><span>Talla <span class="muted" data-size-lbl>— elige una</span></span><button class="link-btn" data-soon="Guía de tallas">Guía de tallas</button></div>
      <div class="sizes" role="radiogroup" aria-label="Talla">
        ${p.sizes.map(s => `<button class="size" role="radio" aria-checked="false" data-size="${s}" ${p.stock?.[s] ? '' : 'disabled'}>${s}</button>`).join('')}
      </div>
      <p class="muted" style="font-size:13px;margin-top:8px" data-stock></p>

      <div class="pdp__actions">
        <button class="btn btn--accent btn--block" data-add>Añadir a la bolsa ${icon.arrow}</button>
        <button class="icon-btn ${wish ? 'is-on' : ''}" data-wish="${p.id}" aria-pressed="${wish}" aria-label="Guardar en favoritos">${icon.heart}</button>
      </div>

      <div class="perks">
        <div><b>Envío</b>Gratis desde ${SF.money(SF.config.shipping.freeFrom)}</div>
        <div><b>Cambios</b>30 días para cambiar</div>
        <div><b>Pago seguro</b>Muy pronto en línea</div>
      </div>

      <details class="acc" open><summary>Detalles</summary><ul>${(p.features || []).map(f => `<li><strong>${esc(f.title)}:</strong> ${esc(f.text)}</li>`).join('')}</ul></details>
      <details class="acc"><summary>Material y cuidado</summary><p class="muted">Tela tipo nylon/poliéster con forro. Lavar a mano o en ciclo delicado, agua fría, no usar secadora. <em>(Texto de ejemplo — actualizar con la ficha real.)</em></p></details>
      <details class="acc"><summary>Envíos y devoluciones</summary><p class="muted">Despacho en 1–3 días hábiles. Envío nacional. Cambios dentro de 30 días con etiquetas. <em>(Ajustar a la política real.)</em></p></details>
    </div>
  </div>
  <div class="sticky-buy" data-sticky><div style="flex:1;line-height:1.2"><strong>${esc(p.name)}</strong><br><span style="opacity:.7">${SF.money(p.price)}</span></div><button class="btn btn--accent btn--sm" data-add>Añadir</button></div>`;

  const lbl = $('[data-size-lbl]'), stock = $('[data-stock]');
  $$('.size').forEach(b => b.addEventListener('click', () => {
    size = b.dataset.size;
    $$('.size').forEach(x => { x.classList.toggle('is-on', x === b); x.setAttribute('aria-checked', x === b); });
    lbl.textContent = '— ' + size;
    const n = p.stock?.[size] || 0;
    stock.textContent = n <= 5 ? `¡Solo quedan ${n} en talla ${size}!` : 'Disponible';
  }));

  $$('[data-add]').forEach(b => b.addEventListener('click', () => {
    if (!size) {
      SF.toast('Elige una talla primero', 'err');
      const s = $('.sizes'); s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      s.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-8px)' }, { transform: 'translateX(8px)' }, { transform: 'translateX(0)' }], { duration: 320 });
      return;
    }
    try { SF.cart.add(p.id, size); SF.bump(); SF.toast(`${p.name} (${size}) añadido`); setTimeout(() => SF.open('cart'), 300); }
    catch (ex) { SF.toast(ex.message, 'err'); }
  }));

  // Zoom que sigue al cursor
  const g = $('[data-zoom]'), img = $('img', g);
  g.addEventListener('click', () => g.classList.toggle('is-zoom'));
  g.addEventListener('mousemove', (e) => { const r = g.getBoundingClientRect(); img.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%'); img.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%'); });
  g.addEventListener('mouseleave', () => g.classList.remove('is-zoom'));

  // Barra fija en móvil cuando el botón principal sale de vista
  const sticky = $('[data-sticky]');
  new IntersectionObserver(([en]) => sticky.classList.toggle('is-on', !en.isIntersecting && en.boundingClientRect.top < 0)).observe($('.pdp__actions'));
})();
