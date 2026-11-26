/* =========================================================
   Intro de bienvenida
   1) Video con sonido a pantalla completa.
      Los navegadores bloquean el sonido automático hasta que la persona
      interactúa, así que si se bloquea se muestra una pantalla "Entrar"
      (un clic = permiso para reproducir con sonido).
   2) Al terminar aparece el logo SF Urban al centro.
   3) El logo vuela hasta su lugar en el header (arriba a la derecha)
      y se revela el contenido.
   Se muestra una vez por visita (sessionStorage). index.html?intro=1 la repite.
   ========================================================= */
(function () {
  const { $, icon } = SF;
  const wait = (ms) => new Promise(r => setTimeout(r, ms));
  // Ejecuta una animación y continúa aunque el navegador no resuelva .finished (pestañas en segundo plano)
  const run = (elm, frames, opts) => { const a = elm.animate(frames, { fill: 'forwards', ...opts }); return Promise.race([a.finished.catch(() => {}), wait(opts.duration + 120)]); };

  SF.runIntro = ({ onDone }) => {
    const cfg = SF.config.intro || {};
    const force = new URLSearchParams(location.search).has('intro');
    let seen = false; try { seen = sessionStorage.getItem('sf-intro') === '1'; } catch {}
    const wantsIntro = SF.db.kv.get('pref:introOn', true), wantsSound = SF.db.kv.get('pref:introSound', true);
    if (!cfg.enabled || (!force && (seen || !wantsIntro))) { onDone(false); return; }

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('reduce-motion');
    const root = document.documentElement;
    root.classList.add('intro-on'); scrollTo(0, 0);

    const el = document.createElement('div');
    el.className = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Bienvenida SF Urban');
    el.innerHTML = `
      <video playsinline preload="auto" src="${cfg.video}"></video>
      <div class="intro__gate" hidden>
        ${SF.isoSVG}
        <button class="intro__enter" data-enter><i></i>Entrar</button>
        <span class="intro__hint">Mejor con sonido</span>
      </div>
      <div class="intro__controls" hidden>
        <button data-mute aria-label="Silenciar">${icon.soundOn}<span>Sonido</span></button>
        <button data-skip>Saltar intro</button>
      </div>
      <div class="intro__logo" aria-hidden="true">${SF.brandMark()}<span class="intro__tag">WOMEN &amp; MEN — ACTIVEWEAR</span></div>`;
    document.body.appendChild(el);

    const v = $('video', el), gate = $('.intro__gate', el), ctr = $('.intro__controls', el), mute = $('[data-mute]', el);
    let finished = false, stallTimer;

    const playing = () => {
      gate.hidden = true; ctr.hidden = false;
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => { if (v.currentTime < 0.5) showLogo(); }, 7000); // por si la red se cuelga
    };
    const setMuteUI = () => { mute.innerHTML = (v.muted ? icon.soundOff : icon.soundOn) + `<span>${v.muted ? 'Activar sonido' : 'Sonido'}</span>`; };

    // Intento de reproducción con sonido; si el navegador lo bloquea, pantalla "Entrar"
    // (si en Ajustes se desactivó el sonido, arranca en silencio y sin pantalla "Entrar")
    v.muted = !wantsSound;
    v.play().then(() => { playing(); setMuteUI(); }).catch(() => { if (!finished) gate.hidden = false; });

    $('[data-enter]', el).addEventListener('click', () => {
      v.muted = !wantsSound; v.currentTime = 0;
      v.play().then(playing).catch(() => { v.muted = true; v.play().then(playing).catch(showLogo); });
      setMuteUI();
    });
    mute.addEventListener('click', () => { v.muted = !v.muted; setMuteUI(); });
    $('[data-skip]', el).addEventListener('click', showLogo);
    v.addEventListener('ended', showLogo);
    v.addEventListener('error', showLogo);
    addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && !finished) { showLogo(); removeEventListener('keydown', esc); } });

    async function showLogo() {
      if (finished) return; finished = true;
      clearTimeout(stallTimer);
      try { sessionStorage.setItem('sf-intro', '1'); } catch {}
      gate.hidden = true; ctr.hidden = true;
      el.classList.add('is-logo');
      // Baja el volumen suavemente en vez de cortar
      const fade = setInterval(() => { v.volume = Math.max(0, v.volume - 0.1); if (v.volume <= 0) { clearInterval(fade); v.pause(); } }, 50);

      const logo = $('.intro__logo', el), brand = $('.brand', logo), tag = $('.intro__tag', logo);
      const vw = innerWidth, vh = innerHeight;
      const x0 = (vw - logo.offsetWidth) / 2, y0 = (vh - logo.offsetHeight) / 2;
      logo.style.left = '0'; logo.style.top = '0';
      const at = (x, y, s = 1) => `translate(${x}px, ${y}px) scale(${s})`;

      if (reduce) { finish(); return; }

      await run(logo, [{ opacity: 0, transform: at(x0, y0 + 14, .94) }, { opacity: 1, transform: at(x0, y0) }], { duration: 900, easing: 'cubic-bezier(.22,1,.36,1)' });
      await wait(900);

      // Vuelo hasta el logo del header (arriba a la derecha)
      const target = $('[data-header-logo] .brand');
      const sb = brand.getBoundingClientRect(), tb = target.getBoundingClientRect();
      const s = tb.width / sb.width;
      const bx = sb.left - x0, by = sb.top - y0;
      const X = tb.left - bx * s, Y = tb.top - by * s;
      tag.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
      setTimeout(() => { el.classList.add('is-out'); document.documentElement.classList.add('intro-reveal'); onDone(true); }, 250);
      await run(logo, [{ opacity: 1, transform: at(x0, y0) }, { opacity: 1, transform: at(X, Y, s) }], { duration: 1100, easing: 'cubic-bezier(.65,0,.35,1)' });
      finish();
    }

    function finish() {
      root.classList.remove('intro-on', 'intro-reveal');
      if (reduce) onDone(false);
      run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 1 : 150 }).then(() => { v.removeAttribute('src'); v.load(); el.remove(); });
      if (force) history.replaceState(null, '', location.pathname + location.hash);
    }
  };
})();
