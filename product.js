/* =========================================================
   Página de producto: galería con zoom, tallas con stock,
   añadir al carrito, favoritos y detalles.
   ========================================================= */
(function () {
  const { $, $$, esc, icon } = SF;
  SF.mountStylePanel();
  SF.mountLayout();

  const id = new URLSearchParams(location.search).get('id') || 'p-0001';
  const root = $('[data-pdp]');
  let shownJson = null, tracked = false;

  // Se pinta al cargar y otra vez si la prenda cambia en la base de datos (precio, stock, fotos…)
  function show() {
  const p = SF.getProduct(id);
  const json = JSON.stringify(p || null);
  if (json === shownJson) return;
  shownJson = json;

  if (!p || p.status !== 'active') {
    root.innerHTML = `<div class="success" style="padding-top:calc(var(--header-h) + 80px)"><h1 class="display h-m">Esta prenda <span class="serif">aún no llega</span></h1><p class="muted">Estamos preparando nuevas piezas. Mientras tanto, mira lo que ya está disponible.</p><a class="btn btn--accent" href="index.html#explorar">Explorar ${icon.arrow}</a></div>`;
    return;
  }
  document.title = `${p.name} — SF Urban`;
  if (!tracked) { SF.track('product_view', { productId: p.id }); tracked = true; }

  let size = null;
  const wish = SF.wish.has(p.id);
  root.innerHTML = `
  <div class="pdp">
    <div class="pdp__gallery" data-zoom aria-label="Imagen del producto. Haz clic para ampliar.">
      <div class="ring" aria-hidden="true"></div>
      ${p.images[0] ? `<img src="${p.images[0]}" alt="${esc(p.name)}">` : ''}
      ${p.images.length > 1 ? `<div class="pdp__thumbs">${p.images.map((u, k) => `<button class="${k ? '' : 'is-on'}" data-thumb="${k}" aria-label="Foto ${k + 1}"><img src="${u}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}
    </div>
    <div class="pdp__info">
      <nav class="crumbs" aria-label="Migas de pan"><a href="index.html#inicio">Inicio</a> / <a href="index.html#explorar">Explorar</a> / <span>${esc(p.name)}</span></nav>
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
        <button class="btn btn--accent btn--block" data-add>Añadir al carrito ${icon.cart}</button>
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
  `;

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
    try { SF.cart.add(p.id, size); SF.bump(); SF.toast(`${p.name} (${size}) en tu carrito`, 'ok', { label: 'Ver carrito', href: 'index.html#carrito' }); }
    catch (ex) { SF.toast(ex.message, 'err'); }
  }));

  // Zoom que sigue al cursor
  const g = $('[data-zoom]'), img = $('img', g);
  $$('[data-thumb]').forEach(b => b.addEventListener('click', (e) => {
    e.stopPropagation(); g.classList.remove('is-zoom');
    img.src = p.images[+b.dataset.thumb];
    $$('[data-thumb]').forEach(x => x.classList.toggle('is-on', x === b));
  }));
  if (!img) return;
  g.addEventListener('click', () => g.classList.toggle('is-zoom'));
  g.addEventListener('mousemove', (e) => { const r = g.getBoundingClientRect(); img.style.setProperty('--zx', ((e.clientX - r.left) / r.width) * 100 + '%'); img.style.setProperty('--zy', ((e.clientY - r.top) / r.height) * 100 + '%'); });
  g.addEventListener('mouseleave', () => g.classList.remove('is-zoom'));
  }

  show();
  addEventListener('sf:catalog', show);
})();
