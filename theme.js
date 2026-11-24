/* =========================================================
   Panel de estilo (herramienta interna para decidir la identidad).
   Permite probar paletas y tipografías en vivo. Se guarda en el
   navegador. Para ocultarlo en producción: SF.config.showStylePanel = false
   o quitar este script.
   ========================================================= */
(function () {
  const apply = () => {
    const pal = SF.config.palettes[SF.db.kv.get('palette', SF.config.defaults.palette)] || SF.config.palettes[SF.config.defaults.palette];
    const font = SF.config.fonts[SF.db.kv.get('font', SF.config.defaults.font)] || SF.config.fonts[SF.config.defaults.font];
    const r = document.documentElement.style;
    Object.entries(pal.vars).forEach(([k, v]) => r.setProperty(k, v));
    r.setProperty('--f-display', font.display); r.setProperty('--f-body', font.body); r.setProperty('--f-serif', font.serif);
    document.documentElement.dataset.font = SF.db.kv.get('font', SF.config.defaults.font);
  };
  apply(); // antes de pintar, evita parpadeo

  SF.mountStylePanel = () => {
    if (SF.config.showStylePanel === false) return;
    const cur = { p: SF.db.kv.get('palette', SF.config.defaults.palette), f: SF.db.kv.get('font', SF.config.defaults.font) };
    const el = document.createElement('div');
    el.className = 'style-panel';
    el.innerHTML = `
      <button class="style-panel__toggle" aria-expanded="false" aria-controls="spBody" title="Probar paletas y tipografías">
        <span class="sw-dots">${Object.values(SF.config.palettes).slice(0, 3).map(p => `<i style="background:${p.vars['--accent']}"></i>`).join('')}</span><span class="sp-txt">Estilo</span>
      </button>
      <div class="style-panel__body" id="spBody" hidden>
        <p class="sp-title">Paleta <small>regla 60 · 30 · 10</small></p>
        <div class="sp-palettes">
          ${Object.entries(SF.config.palettes).map(([k, p]) => `
            <button class="sp-pal ${k === cur.p ? 'is-on' : ''}" data-pal="${k}" title="${p.label}">
              <span class="sp-sw"><i style="background:${p.vars['--bg']};flex:6"></i><i style="background:${p.vars['--ink']};flex:3"></i><i style="background:${p.vars['--accent']};flex:1"></i></span>
              <span class="sp-lbl">${p.label}<small>${p.note}</small></span>
            </button>`).join('')}
        </div>
        <p class="sp-title">Tipografía</p>
        <div class="sp-fonts">
          ${Object.entries(SF.config.fonts).map(([k, f]) => `<button class="sp-font ${k === cur.f ? 'is-on' : ''}" data-font="${k}" style="font-family:${f.display}">${f.label.split(' — ')[0]}<small style="font-family:${f.body}">${f.label.split(' — ')[1]}</small></button>`).join('')}
        </div>
        <p class="sp-note">Solo lo ven ustedes mientras deciden. Se guarda en este navegador.</p>
      </div>`;
    document.body.appendChild(el);
    const body = el.querySelector('.style-panel__body'), tg = el.querySelector('.style-panel__toggle');
    tg.addEventListener('click', () => { body.hidden = !body.hidden; tg.setAttribute('aria-expanded', !body.hidden); });
    el.addEventListener('click', (e) => {
      const p = e.target.closest('[data-pal]'), f = e.target.closest('[data-font]');
      if (p) { SF.db.kv.set('palette', p.dataset.pal); el.querySelectorAll('[data-pal]').forEach(b => b.classList.toggle('is-on', b === p)); }
      if (f) { SF.db.kv.set('font', f.dataset.font); el.querySelectorAll('[data-font]').forEach(b => b.classList.toggle('is-on', b === f)); }
      if (p || f) { apply(); dispatchEvent(new Event('resize')); }
    });
  };
})();
