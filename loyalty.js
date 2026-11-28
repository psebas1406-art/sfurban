/* =========================================================
   Tarjeta de fidelidad SF Club (vista "Medios de pago").
   Cerrada: tarjeta con el nombre del cliente y su avance.
   Al tocarla: vuela al centro, gira mostrando los 10 sellos con el logo,
   se rellenan uno a uno y suena un pequeño destello (Web Audio, sin archivos).
   ========================================================= */
(function () {
  const { esc } = SF;
  const iso = () => SF.isoSVG;

  function state() {
    const u = SF.auth.user();
    const p = u ? SF.loyalty.progress() : { total: 0, inCard: 0, left: SF.loyalty.GOAL - 1, rewardNext: false };
    return { u, p, name: u ? u.name : '' };
  }

  // Cara frontal (la misma en la vista y dentro de la animación)
  function front({ u, p, name }) {
    const dots = Array.from({ length: SF.loyalty.GOAL }, (_, i) => `<i class="${i < p.inCard ? 'on' : ''} ${i === SF.loyalty.GOAL - 1 ? 'last' : ''}"></i>`).join('');
    return `
      <span class="lcard__shine"></span>
      <span class="lcard__stripe"></span>
      <span class="lcard__top">${iso()}<span class="lcard__tag">SF CLUB</span></span>
      <span class="lcard__mid"><small>Tarjeta de fidelidad</small><b class="${u ? '' : 'is-ghost'}">${u ? esc(name) : 'Tu nombre aquí'}</b></span>
      <span class="lcard__bottom"><span class="lcard__dots">${dots}</span><span class="lcard__count">${p.inCard}<small>/${SF.loyalty.GOAL}</small></span></span>`;
  }

  // Cara trasera: solo lo necesario → nombre y sellos
  function back({ u, p, name }) {
    const G = SF.loyalty.GOAL;
    const stamps = Array.from({ length: G }, (_, i) => {
      const on = i < p.inCard, last = i === G - 1;
      return `<span class="stamp ${on ? 'is-on' : ''} ${last ? 'is-reward' : ''}" style="--i:${i}">${last ? '<em>60%</em>' : iso()}</span>`;
    }).join('');
    return `
      <span class="lcard__stripe"></span>
      <span class="lback__head">${iso()}<span class="lcard__tag">SF CLUB</span></span>
      <b class="lback__name ${u ? '' : 'is-ghost'}">${u ? esc(name) : 'Tu nombre aquí'}</b>
      <span class="lback__stamps">${stamps}</span>`;
  }

  function caption({ u, p }) {
    if (!u) return `
      <p><b>Activa tu tarjeta</b>Crea tu cuenta gratis para que la tarjeta quede a tu nombre y empiece a sumar sellos.</p>
      <div class="lmodal__cta"><button class="btn btn--accent" data-loyal-auth="register">Crear mi cuenta</button><button class="btn btn--ghost" data-loyal-auth="login">Ya tengo cuenta</button></div>`;
    const msg = p.rewardNext
      ? `<b>¡Tu próxima prenda tiene 60 % de descuento!</b>Se aplica sola en tu carrito.`
      : `<b>Te ${p.left === 1 ? 'falta 1 prenda' : `faltan ${p.left} prendas`} para tu 60 %</b>Llevas ${p.inCard} de ${SF.loyalty.GOAL - 1} sellos.`;
    return `<p>${msg}</p>`;
  }

  /* ---------- Sonido: destello corto (whoosh + campanitas) ---------- */
  function sparkle() {
    if (!SF.pref?.get('uiSound', true)) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = new AC(), t0 = ctx.currentTime + 0.02;
      const master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
      // Whoosh deportivo: ruido filtrado que sube de tono
      const len = Math.floor(ctx.sampleRate * 0.45), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const noise = ctx.createBufferSource(); noise.buffer = buf;
      const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(700, t0); bp.frequency.exponentialRampToValueAtTime(5200, t0 + 0.38);
      const ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(0.7, t0 + 0.08); ng.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      noise.connect(bp).connect(ng).connect(master); noise.start(t0); noise.stop(t0 + 0.45);
      // Destello: arpegio brillante (Sol6, Do7, Mi7, Sol7)
      [1568, 2093, 2637, 3136].forEach((f, i) => {
        const s = t0 + 0.22 + i * 0.065;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = i % 2 ? 'triangle' : 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, s); g.gain.exponentialRampToValueAtTime(0.5, s + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, s + 0.7);
        o.connect(g).connect(master); o.start(s); o.stop(s + 0.75);
      });
      setTimeout(() => ctx.close(), 1600);
    } catch {}
  }

  /* ---------- Abrir con animación ---------- */
  function open(fromEl) {
    const st = state();
    const m = document.createElement('div');
    m.className = 'lmodal';
    m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', 'Tarjeta de fidelidad SF Club');
    m.innerHTML = `
      <div class="lmodal__scrim" data-loyal-close></div>
      <div class="lmodal__body">
        <div class="lmodal__stage">
          <span class="lspeed" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
          <div class="lflip">
            <div class="lflip__face lflip__front lcard">${front(st)}</div>
            <div class="lflip__face lflip__back lcard">${back(st)}</div>
          </div>
        </div>
        <div class="lmodal__caption">${caption(st)}<small class="lmodal__rule">Por cada 9 prendas que compres, la 10.ª tiene 60 % de descuento. Se aplica sola en el carrito con tu cuenta iniciada. <a href="terminos.html#fidelidad">Condiciones</a></small></div>
        <button class="lmodal__close icon-btn" data-loyal-close aria-label="Cerrar">${SF.icon.close}</button>
      </div>`;
    document.body.appendChild(m);
    document.body.style.overflow = 'hidden';

    // FLIP: la tarjeta sale desde donde estaba en la página
    const stage = m.querySelector('.lmodal__stage');
    if (fromEl) {
      const a = fromEl.getBoundingClientRect(), b = stage.getBoundingClientRect();
      const sx = a.width / b.width, dx = (a.left + a.width / 2) - (b.left + b.width / 2), dy = (a.top + a.height / 2) - (b.top + b.height / 2);
      stage.style.transform = `translate(${dx}px, ${dy}px) scale(${sx})`;
      fromEl.style.visibility = 'hidden';
    }
    m.getBoundingClientRect(); // aplica el estado inicial antes de animar
    requestAnimationFrame(() => {
      m.classList.add('is-in');
      stage.style.transform = '';
      setTimeout(() => { m.classList.add('is-flipped'); sparkle(); }, 520);
    });

    const close = () => {
      m.classList.remove('is-in'); m.classList.add('is-out');
      setTimeout(() => { m.remove(); document.body.style.overflow = ''; if (fromEl) fromEl.style.visibility = ''; fromEl?.focus(); }, 380);
      removeEventListener('keydown', onKey);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => {
      if (e.target.closest('[data-loyal-close]')) close();
      const a = e.target.closest('[data-loyal-auth]');
      if (a) { close(); setTimeout(() => SF.openAuth(a.dataset.loyalAuth), 400); }
      if (e.target.closest('.lflip')) m.classList.toggle('is-flipped');
    });
    setTimeout(() => m.querySelector('.lmodal__close')?.focus(), 60);
  }

  SF.loyaltyCard = {
    html() { return `<button class="lcard lcard--page" data-loyal-open aria-label="Abrir mi tarjeta de fidelidad">${front(state())}<span class="lcard__hint">Toca para abrir</span></button>`; },
    open,
  };
  document.addEventListener('click', (e) => { const b = e.target.closest('[data-loyal-open]'); if (b) open(b); });
})();
