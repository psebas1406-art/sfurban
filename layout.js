/* =========================================================
   Layout compartido (todas las páginas)
   - Header: ajustes (engranaje) a la izquierda · logo a la derecha.
   - Barra flotante "liquid glass": Inicio · Explorar · Favoritos ·
     Carrito · Pagos · Perfil  (vistas en index.html#<vista>).
   - Panel de ajustes, modal de cuenta, toasts, chat.
   ========================================================= */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  SF.$ = $; SF.$$ = $$;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SF.esc = esc;

  /* ---------- Íconos (trazo 1.8, esquinas redondeadas, estilo de la marca) ---------- */
  const I = (d, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
  const icon = {
    home: I('<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h4.5v-5.5h4V20h4.5V9.5"/>'),
    search: I('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6"/>'),
    heart: I('<path d="M12 20s-7.5-4.6-7.5-10.4A4.1 4.1 0 0 1 12 7.3a4.1 4.1 0 0 1 7.5 2.3C19.5 15.4 12 20 12 20z"/>'),
    cart: I('<path d="M2.5 4h2.6l2.3 11h10.3l2.1-7.6H6.3"/><circle cx="9.5" cy="19.3" r="1.4"/><circle cx="16.8" cy="19.3" r="1.4"/>'),
    card: I('<rect x="2.8" y="5.2" width="18.4" height="13.6" rx="2.6"/><path d="M2.8 9.6h18.4"/><path d="M6.5 14.8h4"/>'),
    user: I('<circle cx="12" cy="7.6" r="3.6"/><path d="M4.8 20.2c.9-4 3.7-6.4 7.2-6.4s6.3 2.4 7.2 6.4"/>'),
    gear: I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
    bag: I('<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>'),
    close: I('<path d="M6 6l12 12M18 6 6 18"/>'),
    chat: I('<path d="M4 5h16v11H9l-5 4V5z"/>'),
    arrow: I('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    back: I('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
    share: I('<path d="M21 4 10 14M21 4l-6.5 16-3.5-6.5L4.5 10z"/>'),
    bookmark: I('<path d="M6 4h12v16l-6-4.5L6 20z"/>'),
    soundOn: I('<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
    soundOff: I('<path d="M4 9.5h4l5-4v13l-5-4H4z"/><path d="m17 9.5 5 5M22 9.5l-5 5"/>'),
    truck: I('<path d="M2.5 6h11v10h-11z"/><path d="M13.5 9.5h4l3 3.2V16h-7"/><circle cx="6.5" cy="17.5" r="1.6"/><circle cx="17" cy="17.5" r="1.6"/>'),
    shield: I('<path d="M12 3.5 19 6v5.5c0 4.4-3 7.8-7 9-4-1.2-7-4.6-7-9V6z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
    bank: I('<path d="M3.5 9 12 4l8.5 5"/><path d="M5 9.5V17M9.7 9.5V17M14.3 9.5V17M19 9.5V17"/><path d="M3.5 19.5h17"/>'),
    phone: I('<rect x="6.5" y="2.8" width="11" height="18.4" rx="2.4"/><path d="M10.5 17.8h3"/>'),
    cash: I('<rect x="2.8" y="6.5" width="18.4" height="11" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
    box: I('<path d="M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4z"/><path d="M3.5 7.5 12 11.5l8.5-4M12 11.5v9"/>'),
    pin: I('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
    logout: I('<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4M6 12h10"/>'),
    filter: I('<path d="M4 6h16M7 12h10M10 18h4"/>'),
  };
  SF.icon = icon;

  /* ---------- Logo oficial (isotipo SF + "Urban" + sudadera) ---------- */
  SF.isoSVG = `<svg class="brand__iso" viewBox="240 385 610 440" aria-hidden="true"><g fill="#F5F5F2"><polygon points="338,395 897,395 880,479 321,479"/><polygon points="321,479 406,479 388,563 553,563 500,813 250,813 267,731 436,731 453,647 285,647"/><polygon points="628,479 713,479 641,813 558,813"/></g><polygon fill="#E4002B" points="697,556 838,604 677,653"/></svg>`;
  const hoodSVG = `<svg class="brand__hood" viewBox="0 0 100 112" aria-hidden="true"><path fill="#E4002B" d="M50 4c11 0 19 8 19 18v4l15 7 12 40-11 3-5-18v52H20V58l-5 18-11-3 12-40 15-7v-4C31 12 39 4 50 4z"/><path fill="none" stroke="#0D0D0F" stroke-width="4" d="M41 20c0-6 4-9 9-9s9 3 9 9-4 9-9 9-9-3-9-9zM46 29v14M54 29v14M33 76h34l3 20H30z"/></svg>`;
  SF.brandMark = (cls = '') => `<span class="brand ${cls}">${SF.isoSVG}<span class="brand__word">Urban</span>${hoodSVG}</span>`;
  SF.logo = `<a href="index.html#inicio" class="logo" aria-label="SF Urban, inicio" data-header-logo>${SF.brandMark()}</a>`;

  /* ---------- Navegación entre vistas ---------- */
  SF.views = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'explorar', label: 'Explorar', icon: 'search' },
    { id: 'favoritos', label: 'Favoritos', icon: 'heart' },
    { id: 'carrito', label: 'Carrito', icon: 'cart' },
    { id: 'pagos', label: 'Pagos', icon: 'card' },
    { id: 'perfil', label: 'Perfil', icon: 'user' },
  ];
  const isHome = () => document.body.dataset.page === 'home';
  SF.goView = (id) => { if (isHome()) { if (location.hash !== '#' + id) location.hash = id; else dispatchEvent(new HashChangeEvent('hashchange')); } else location.href = 'index.html#' + id; };

  function header() {
    return `
    <header class="site-header" id="siteHeader">
      <div class="site-header__inner">
        <div class="header-left">
          <button class="gear-btn" data-settings aria-label="Ajustes" aria-expanded="false" aria-controls="settingsPanel">${icon.gear}</button>
          <button class="chat-btn" data-chat aria-label="Asistente de SF Urban">${icon.chat}<span>Asistente</span></button>
        </div>
        ${SF.logo}
      </div>
    </header>`;
  }

  function dock() {
    return `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true">
      <filter id="sf-glass" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.04" numOctaves="2" seed="4" result="noise"/>
        <feGaussianBlur in="noise" stdDeviation="2.5" result="soft"/>
        <feDisplacementMap in="SourceGraphic" in2="soft" scale="42" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
    </svg>
    <nav class="dock" aria-label="Navegación principal" data-dock>
      <span class="dock__pill" data-dock-pill aria-hidden="true"></span>
      ${SF.views.map(v => `
        <a class="dock__item" href="index.html#${v.id}" data-dock-item="${v.id}" aria-label="${v.label}">
          <span class="dock__ico">${icon[v.icon]}${v.id === 'carrito' ? '<span class="badge" data-cart-count hidden>0</span>' : ''}${v.id === 'favoritos' ? '<span class="badge badge--soft" data-wish-count hidden>0</span>' : ''}${v.id === 'perfil' ? '<span class="dot" data-user-dot hidden></span>' : ''}</span>
          <span class="dock__lbl">${v.label}</span>
        </a>`).join('')}
    </nav>`;
  }

  function footer() {
    const b = SF.config.brand, L = SF.config.legal;
    return `
    <footer class="site-footer">
      ${SF.isoSVG}
      <p class="serif">${esc(b.motto)}</p>
      <nav class="footer-legal" aria-label="Información legal">
        <a href="${L.docs.terminos}">Términos y condiciones</a>
        <a href="${L.docs.privacidad}">Política de privacidad</a>
        <a href="${L.docs.cookies}">Política de cookies</a>
        <a href="${L.docs.reembolsos}">Cambios, devoluciones y reembolsos</a>
        <button type="button" data-cookie-settings>Preferencias de cookies</button>
      </nav>
      <details class="footer-id">
        <summary>Datos del vendedor</summary>
        <p>Responsables: ${esc(L.responsable)} · ${esc(L.documento)}<br>
          ${esc(L.direccion)}, ${esc(L.ciudad)} · Tel. ${esc(L.telefono)} · ${esc(b.email)}</p>
      </details>
      <p class="footer-sic">Si tienes una queja y no la resolvemos, puedes acudir a la <a href="https://www.sic.gov.co" target="_blank" rel="noopener">Superintendencia de Industria y Comercio (SIC)</a>.</p>
      <p>© ${new Date().getFullYear()} ${esc(b.name)}</p>
    </footer>`;
  }

  /* ---------- Banner de cookies (consentimiento previo, rechazar tan fácil como aceptar) ---------- */
  function cookieBanner() {
    return `
    <div class="cookie-banner" data-cookie-banner hidden role="dialog" aria-live="polite" aria-label="Cookies y almacenamiento">
      <div class="cookie-banner__txt">
        <strong>Tu privacidad 🍪</strong>
        <p>Usamos almacenamiento <b>necesario</b> para que la tienda funcione (carrito, sesión, preferencias). Con tu permiso, también <b>analítica propia</b> para saber qué prendas interesan más. No usamos publicidad ni rastreo de terceros. <a href="${SF.config.legal.docs.cookies}">Política de cookies</a></p>
      </div>
      <div class="cookie-banner__actions">
        <button class="btn btn--ghost btn--sm" data-cookie-choice="reject">Solo necesarias</button>
        <button class="btn btn--ghost btn--sm" data-cookie-settings>Configurar</button>
        <button class="btn btn--accent btn--sm" data-cookie-choice="accept">Aceptar todas</button>
      </div>
    </div>
    <div class="modal" id="cookieModal" role="dialog" aria-modal="true" aria-labelledby="cookieTitle" aria-hidden="true">
      <div class="modal__card modal__card--narrow">
        <button class="icon-btn modal__x" data-cookie-close aria-label="Cerrar">${icon.close}</button>
        <div class="auth-main">
          <h3 id="cookieTitle" class="cookie-title">Preferencias de cookies</h3>
          <label class="set-row"><span><b>Necesarias</b><small>Carrito, sesión, favoritos, preferencias de la web y este mismo aviso. Siempre activas.</small></span><input type="checkbox" class="switch" checked disabled></label>
          <label class="set-row"><span><b>Analítica propia</b><small>Páginas y prendas vistas, búsquedas y uso del chat, para mejorar la tienda. No se comparte con terceros.</small></span><input type="checkbox" class="switch" data-cookie-analytics></label>
          <div class="cookie-modal__actions">
            <button class="btn btn--ghost btn--sm" data-cookie-choice="reject">Rechazar opcionales</button>
            <button class="btn btn--accent btn--sm" data-cookie-save>Guardar mi elección</button>
          </div>
          <p class="legal-note">Puedes cambiar esto cuando quieras desde el pie de página o en Ajustes. <a href="${SF.config.legal.docs.cookies}">Más información</a></p>
        </div>
      </div>
    </div>`;
  }
  function showCookieBanner(show) { const b = $('[data-cookie-banner]'); if (b) b.hidden = !show; }
  function openCookieModal() {
    const m = $('#cookieModal'); $('[data-cookie-analytics]', m).checked = SF.consent.cookies.analytics();
    closeSettings(); m.classList.add('is-open'); m.setAttribute('aria-hidden', 'false'); showScrim();
  }
  function closeCookieModal() { const m = $('#cookieModal'); if (!m.classList.contains('is-open')) return; m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true'); hideScrim(); }
  async function chooseCookies(analytics, method) {
    await SF.consent.cookies.set(analytics, method);
    showCookieBanner(false); closeCookieModal();
    SF.toast(analytics ? 'Preferencias guardadas: analítica activada' : 'Preferencias guardadas: solo lo necesario', 'info');
  }

  /* ---------- Panel de ajustes ---------- */
  const pref = {
    get: (k, d) => SF.db.kv.get('pref:' + k, d),
    set: (k, v) => SF.db.kv.set('pref:' + k, v),
  };
  SF.pref = pref;
  const toggle = (key, def, label, hint) => `
    <label class="set-row"><span><b>${label}</b>${hint ? `<small>${hint}</small>` : ''}</span>
      <input type="checkbox" class="switch" data-pref="${key}" ${pref.get(key, def) ? 'checked' : ''}></label>`;
  function settingsHTML() {
    const u = SF.auth.user();
    return `
      <div class="settings__head"><h2>Ajustes</h2><button class="icon-btn" data-settings-close aria-label="Cerrar">${icon.close}</button></div>
      <div class="settings__body">
        <section><h3>Intro de bienvenida</h3>
          ${toggle('introOn', true, 'Mostrar al entrar', 'Una vez por visita')}
          ${toggle('introSound', true, 'Con sonido', 'El navegador pedirá un toque para activarlo')}
          <a class="set-row set-row--link" href="index.html?intro=1"><b>Ver la intro ahora</b>${icon.arrow}</a>
        </section>
        <section><h3>Experiencia</h3>
          ${toggle('reduceMotion', false, 'Reducir animaciones', 'Menos movimiento en la página')}
          ${toggle('uiSound', true, 'Sonidos de la interfaz', 'Por ejemplo, al abrir tu tarjeta SF Club')}
        </section>
        <section><h3>Cuenta</h3>
          <a class="set-row set-row--link" href="index.html#perfil" data-settings-close><b>${u ? 'Mi perfil' : 'Iniciar sesión o registrarme'}</b>${icon.arrow}</a>
          <a class="set-row set-row--link" href="index.html#pagos" data-settings-close><b>Medios de pago</b>${icon.arrow}</a>
          ${u ? `<button class="set-row set-row--link" data-logout><b>Cerrar sesión</b>${icon.logout}</button>` : ''}
        </section>
        <section><h3>Ayuda</h3>
          <button class="set-row set-row--link" data-chat><b>Chatear con nosotros</b>${icon.chat}</button>
          <a class="set-row set-row--link" href="mailto:${esc(SF.config.brand.email)}"><b>Escribir un correo</b>${icon.arrow}</a>
          <button class="set-row set-row--link" data-soon="Guía de tallas"><b>Guía de tallas</b>${icon.arrow}</button>
          <a class="set-row set-row--link" href="${SF.config.legal.docs.reembolsos}"><b>Envíos, cambios y devoluciones</b>${icon.arrow}</a>
        </section>
        <section><h3>Privacidad</h3>
          <button class="set-row set-row--link set-row--danger" data-wipe><b>Borrar mis datos de este dispositivo</b>${icon.close}</button>
          <button class="set-row set-row--link" data-cookie-settings><b>Preferencias de cookies</b>${icon.arrow}</button>
          <a class="set-row set-row--link" href="${SF.config.legal.docs.privacidad}"><b>Política de privacidad</b>${icon.arrow}</a>
          <a class="set-row set-row--link" href="${SF.config.legal.docs.terminos}"><b>Términos y condiciones</b>${icon.arrow}</a>
          <a class="set-row set-row--link" href="${SF.config.legal.docs.reembolsos}"><b>Cambios, devoluciones y reembolsos</b>${icon.arrow}</a>
        </section>
        <p class="settings__foot">${SF.isoSVG}<span>SF Urban · v0.3</span></p>
      </div>`;
  }
  function openSettings() {
    const p = $('#settingsPanel'); p.innerHTML = settingsHTML();
    p.classList.add('is-open'); p.setAttribute('aria-hidden', 'false');
    $('[data-settings]').setAttribute('aria-expanded', 'true'); $('[data-settings]').classList.add('is-on');
    showScrim(); setTimeout(() => $('[data-settings-close]', p)?.focus(), 50);
  }
  function closeSettings() {
    const p = $('#settingsPanel'); if (!p.classList.contains('is-open')) return;
    p.classList.remove('is-open'); p.setAttribute('aria-hidden', 'true');
    $('[data-settings]').setAttribute('aria-expanded', 'false'); $('[data-settings]').classList.remove('is-on');
    hideScrim();
  }
  SF.applyPrefs = () => document.documentElement.classList.toggle('reduce-motion', !!pref.get('reduceMotion', false));

  /** Casillas legales obligatorias, separadas y SIN marcar, cada una con su enlace. */
  function legalChecks() {
    return `
      ${SF.consent.checkbox('terminos', { linkText: 'Términos y condiciones' })}
      ${SF.consent.checkbox('privacidad', { linkText: 'Política de privacidad' })}
      ${SF.consent.checkbox('mayoria_edad')}`;
  }
  SF.legalChecks = legalChecks;

  function overlays() {
    return `
    <div class="scrim" data-scrim hidden></div>
    <aside class="settings" id="settingsPanel" aria-label="Ajustes" aria-hidden="true"></aside>

    <div class="modal" id="authModal" role="dialog" aria-modal="true" aria-labelledby="authTitle" aria-hidden="true">
      <div class="modal__card">
        <button class="icon-btn modal__x" data-close aria-label="Cerrar">${icon.close}</button>
        <div class="auth-side" aria-hidden="true">${SF.isoSVG}<div class="auth-side__txt">Únete al <em>club</em></div><p>Acceso anticipado a cada drop, favoritos y seguimiento de pedidos.</p></div>
        <div class="auth-main">
          <div class="tabs" role="tablist">
            <button role="tab" class="tab is-active" data-auth-tab="login">Iniciar sesión</button>
            <button role="tab" class="tab" data-auth-tab="register">Crear cuenta</button>
          </div>
          <h3 id="authTitle" class="sr-only">Cuenta</h3>
          <form class="form" data-auth-form="login" novalidate>
            <label>Correo<input name="email" type="email" autocomplete="email" required></label>
            <label>Contraseña<input name="password" type="password" autocomplete="current-password" required></label>
            <button type="button" class="link-btn" data-auth-tab="reset">¿Olvidaste tu contraseña?</button>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Entrar</button>
          </form>
          <form class="form" data-auth-form="register" novalidate hidden>
            <label>Nombre<input name="name" autocomplete="name" required></label>
            <label>Correo<input name="email" type="email" autocomplete="email" required></label>
            <label>Contraseña<input name="password" type="password" autocomplete="new-password" minlength="8" required><small class="muted">Mínimo 8 caracteres.</small></label>
            ${legalChecks()}
            ${SF.consent.checkbox('marketing', { required: false })}
            <p class="legal-note">Solo te pedimos lo necesario para tu cuenta. Celular y dirección se piden al comprar. <a href="${SF.config.legal.docs.privacidad}" target="_blank" rel="noopener">¿Cómo usamos tus datos?</a></p>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Crear cuenta</button>
          </form>
          <form class="form" data-auth-form="reset" novalidate hidden>
            <p class="muted">Te enviaremos un enlace para restablecerla.</p>
            <label>Correo<input name="email" type="email" required></label>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Enviar enlace</button>
            <button type="button" class="link-btn" data-auth-tab="login">← Volver</button>
          </form>
          <form class="form" data-auth-form="newpass" novalidate hidden>
            <p class="muted">Escribe tu nueva contraseña.</p>
            <label>Nueva contraseña<input name="password" type="password" autocomplete="new-password" minlength="8" required></label>
            <p class="form-error" data-error></p>
            <button class="btn btn--accent btn--block" type="submit">Guardar contraseña</button>
          </form>
        </div>
      </div>
    </div>

    <div class="toasts" aria-live="polite" data-toasts></div>
    ${cookieBanner()}

    ${SF.chat ? SF.chat.markup() : ''}`;
  }

  /* ---------- Toasts (con acción opcional) ---------- */
  SF.toast = (msg, type = 'ok', action) => {
    const box = $('[data-toasts]'); if (!box) return;
    const t = document.createElement('div'); t.className = 'toast toast--' + type;
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<a href="${action.href}">${esc(action.label)}</a>` : ''}`;
    box.appendChild(t); requestAnimationFrame(() => t.classList.add('is-in'));
    setTimeout(() => { t.classList.remove('is-in'); setTimeout(() => t.remove(), 400); }, action ? 4200 : 2800);
  };

  /* ---------- Velo + modal de cuenta ---------- */
  let lastFocus = null;
  function showScrim() { const sc = $('[data-scrim]'); sc.hidden = false; requestAnimationFrame(() => sc.classList.add('is-on')); document.documentElement.classList.add('no-scroll'); }
  function hideScrim() { const sc = $('[data-scrim]'); sc.classList.remove('is-on'); setTimeout(() => { if (!sc.classList.contains('is-on')) sc.hidden = true; }, 300); document.documentElement.classList.remove('no-scroll'); }
  SF.open = (name) => {
    if (name === 'cart') return SF.goView('carrito');
    if (name === 'search') return SF.goView('explorar');
    if (name !== 'auth') return;
    SF.closeAll(true); lastFocus = document.activeElement;
    const el = $('#authModal'); el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false');
    showScrim(); setTimeout(() => { const f = el.querySelector('form:not([hidden]) input'); f && f.focus(); }, 60);
  };
  SF.closeAll = (silent) => {
    const m = $('#authModal'); const wasOpen = m.classList.contains('is-open') || $('#settingsPanel').classList.contains('is-open');
    m.classList.remove('is-open'); m.setAttribute('aria-hidden', 'true');
    closeSettings();
    if (wasOpen) hideScrim();
    closeCookieModal();
    if (!silent && lastFocus) lastFocus.focus();
  };

  function updateBadges() {
    const c = SF.cart.count(), w = SF.wish.list().length;
    $$('[data-cart-count]').forEach(b => { b.textContent = c; b.hidden = !c; });
    $$('[data-wish-count]').forEach(b => { b.textContent = w; b.hidden = !w; });
    const u = SF.auth.user(); $$('[data-user-dot]').forEach(d => d.hidden = !u);
  }
  SF.bump = () => { $$('[data-cart-count]').forEach(b => { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }); };

  /* ---------- Barra flotante: marca la vista activa con la "burbuja" ---------- */
  SF.setDock = (id) => {
    const dockEl = $('[data-dock]'); if (!dockEl) return;
    const pill = $('[data-dock-pill]', dockEl);
    const item = $(`[data-dock-item="${id}"]`, dockEl);
    $$('[data-dock-item]', dockEl).forEach(a => { const on = a === item; a.classList.toggle('is-on', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    if (!item) { pill.style.opacity = '0'; return; }
    pill.style.opacity = '1';
    pill.style.width = item.offsetWidth + 'px';
    pill.style.transform = `translateX(${item.offsetLeft}px)`;
  };

  /* ---------- Cuenta ---------- */
  function authTab(name) {
    $$('[data-auth-form]').forEach(f => f.hidden = f.dataset.authForm !== name);
    $$('.tab[data-auth-tab]').forEach(t => t.classList.toggle('is-active', t.dataset.authTab === name));
    $$('[data-auth-form] [data-error]').forEach(e => e.textContent = '');
  }
  SF.openAuth = (tab = 'login') => { authTab(tab); SF.open('auth'); };
  async function onAuthSubmit(e) {
    e.preventDefault(); const f = e.target; const type = f.dataset.authForm; const err = f.querySelector('[data-error]');
    const data = Object.fromEntries(new FormData(f)); err.textContent = '';
    const btn = f.querySelector('[type=submit]'); btn.disabled = true;
    try {
      if (type === 'register') {
        const u = await SF.auth.register({
          name: data.name, email: data.email, password: data.password,
          terms: f.c_terminos.checked, privacy: f.c_privacidad.checked, adult: f.c_mayoria_edad.checked, marketing: f.c_marketing.checked,
        });
        SF.closeAll();
        if (u.pending) SF.toast(`¡Listo, ${u.name.split(' ')[0]}! Te enviamos un correo a ${u.email}: ábrelo para activar tu cuenta.`, 'info');
        else SF.toast(`¡Bienvenid@ al club, ${(u.name || '').split(' ')[0]}!`);
      } else if (type === 'login') {
        const u = await SF.auth.login(data); SF.closeAll(); SF.toast(`Hola de nuevo, ${(u.name || '').split(' ')[0]} 👋`);
      } else if (type === 'newpass') {
        await SF.auth.setNewPassword(data.password); SF.closeAll(); SF.toast('Contraseña actualizada ✓');
      } else { await SF.auth.requestReset(data.email); SF.toast('Si el correo existe, te llegará un enlace.'); authTab('login'); }
      f.reset();
    } catch (ex) { err.textContent = ex.message; }
    btn.disabled = false;
  }

  /* ---------- Revelado al hacer scroll ---------- */
  SF.reveal = (root = document) => {
    const io = new IntersectionObserver((ents) => ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });
    $$('[data-reveal]:not(.is-in)', root).forEach(el => io.observe(el));
  };

  /* ---------- Init ---------- */
  SF.mountLayout = () => {
    SF.applyPrefs();
    document.body.insertAdjacentHTML('afterbegin', header());
    document.body.insertAdjacentHTML('beforeend', footer() + dock() + overlays());
    // Refracción "liquid glass" real solo en navegadores Chromium (en el resto: vidrio esmerilado)
    if (navigator.userAgentData?.brands?.some(b => /Chromium/i.test(b.brand))) document.documentElement.classList.add('glass-refract');

    document.addEventListener('click', (e) => {
      const t = e.target.closest('[data-close],[data-scrim],[data-auth-tab],[data-q],[data-rm],[data-soon],[data-chat],[data-chat-close],[data-wish],[data-settings],[data-settings-close],[data-logout],[data-wipe]');
      if (!t) return;
      if (t.matches('[data-settings]')) { $('#settingsPanel').classList.contains('is-open') ? closeSettings() : openSettings(); }
      else if (t.matches('[data-settings-close]')) { closeSettings(); }
      else if (t.matches('[data-close],[data-scrim]')) { SF.closeAll(); }
      else if (t.matches('[data-auth-tab]')) { authTab(t.dataset.authTab); }
      else if (t.matches('.qty [data-q]')) { const [id, size] = t.closest('[data-line]').dataset.line.split('|'); const l = SF.cart.items().find(i => i.productId === id && i.size === size); SF.cart.setQty(id, size, l.qty + +t.dataset.q); }
      else if (t.matches('[data-rm]')) { const [id, size] = t.dataset.rm.split('|'); SF.cart.remove(id, size); }
      else if (t.matches('[data-soon]')) { e.preventDefault(); SF.toast(`${t.dataset.soon}: disponible muy pronto ✦`, 'info'); }
      else if (t.matches('[data-chat]')) { closeSettings(); SF.chat && SF.chat.toggle(); }
      else if (t.matches('[data-chat-close]')) { SF.chat && SF.chat.close(); }
      else if (t.matches('[data-logout]')) { SF.auth.logout(); closeSettings(); SF.toast('Sesión cerrada'); }
      else if (t.matches('[data-wipe]')) {
        if (confirm('¿Borrar carrito, favoritos, sesión y preferencias guardados en este dispositivo? No se puede deshacer.')) {
          Object.keys(localStorage).filter(k => k.startsWith('sfurban:')).forEach(k => localStorage.removeItem(k));
          try { sessionStorage.clear(); } catch {} location.href = 'index.html#inicio'; location.reload();
        }
      }
      else if (t.matches('[data-wish]')) { e.preventDefault(); const on = SF.wish.toggle(t.dataset.wish); t.classList.toggle('is-on', on); t.setAttribute('aria-pressed', on); SF.toast(on ? 'Guardado en favoritos ♥' : 'Quitado de favoritos', 'info', on ? { label: 'Ver', href: 'index.html#favoritos' } : null); }
    });
    document.addEventListener('change', (e) => {
      const s = e.target.closest('[data-pref]'); if (!s) return;
      pref.set(s.dataset.pref, s.checked); SF.applyPrefs();
    });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { SF.closeAll(); closeCookieModal(); SF.chat && SF.chat.close(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); SF.goView('explorar'); }
    });
    $$('[data-auth-form]').forEach(f => f.addEventListener('submit', onAuthSubmit));
    if (SF.chat) SF.chat.bind();

    // Cookies: el aviso aparece hasta que la persona decide; nada opcional se activa antes.
    document.addEventListener('click', (e) => {
      const c = e.target.closest('[data-cookie-choice],[data-cookie-settings],[data-cookie-save],[data-cookie-close]');
      if (!c) return;
      if (c.matches('[data-cookie-settings]')) openCookieModal();
      else if (c.matches('[data-cookie-close]')) closeCookieModal();
      else if (c.matches('[data-cookie-save]')) chooseCookies($('[data-cookie-analytics]').checked, 'botón guardar en preferencias de cookies');
      else chooseCookies(c.dataset.cookieChoice === 'accept', c.dataset.cookieChoice === 'accept' ? 'botón "Aceptar todas" del aviso de cookies' : 'botón "Solo necesarias / Rechazar" del aviso de cookies');
    });
    showCookieBanner(SF.consent.cookies.get() === null);
    SF.consent.flush();
    // Llegó desde un enlace del correo (confirmar cuenta o cambiar contraseña)
    const notice = SF.db.kv.get('authNotice');
    if (notice) {
      SF.db.kv.del('authNotice');
      setTimeout(() => { if (notice === 'recovery') SF.openAuth('newpass'); else SF.toast(notice, 'info'); }, 600);
    }

    SF.cart.onChange(updateBadges); SF.auth.onChange(updateBadges);
    updateBadges(); SF.reveal();
    // Página que no es el inicio: marca en la barra la sección relacionada
    if (!isHome()) setTimeout(() => SF.setDock(document.body.dataset.dock || ''), 0);
    document.fonts && document.fonts.ready.then(() => SF.setDock($('[data-dock-item].is-on')?.dataset.dockItem || document.body.dataset.dock || ''));
    addEventListener('resize', () => SF.setDock($('[data-dock-item].is-on')?.dataset.dockItem || ''));
    SF.track('page_view', { page: document.body.dataset.page });
  };
})();
