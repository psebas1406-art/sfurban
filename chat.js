/* =========================================================
   Chat con el asistente de IA de SF Urban (en todas las páginas).
   Habla con el mismo agente del servidor (SF.config.agentUrl + '/chat'):
   consulta el catálogo real y responde con precios, tallas y enlaces.
   La conversación se guarda en este navegador para que no se pierda
   al cambiar de página.
   ========================================================= */
(function () {
  const { $, esc, icon } = SF;
  const KEY_SESSION = 'chatSession', KEY_LOG = 'chatLog';
  const MAX_LOG = 40;
  let busy = false, warmed = false;

  const session = () => {
    let s = SF.db.kv.get(KEY_SESSION);
    if (!s) { s = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); SF.db.kv.set(KEY_SESSION, s); }
    return s;
  };
  const log = () => SF.db.kv.get(KEY_LOG, []);
  const save = (list) => SF.db.kv.set(KEY_LOG, list.slice(-MAX_LOG));

  // Texto del asistente → HTML seguro: *negrita*, enlaces y saltos de línea
  function format(text) {
    let h = esc(text);
    h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, (u) => {
      const internal = u.startsWith(location.origin) || u.includes('psebas1406-art.github.io/sfurban');
      return `<a href="${u}"${internal ? '' : ' target="_blank" rel="noopener"'}>${internal ? 'Ver en la tienda →' : u}</a>`;
    });
    h = h.replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>');
    return h.replace(/\n/g, '<br>');
  }

  function bubble(role, text, extraClass = '', img = null) {
    const div = document.createElement('div');
    div.className = `msg msg--${role} ${extraClass}`;
    div.innerHTML = (img ? `<img class="msg__img" src="${img}" alt="Foto de referencia">` : '') + (role === 'bot' ? format(text) : esc(text).replace(/\n/g, '<br>'));
    return div;
  }

  // Saludo: con sesión le habla por su apodo; sin sesión, para todo el mundo
  const greeting = () => {
    const n = SF.auth?.nick?.() || '';
    return n
      ? `¡Hola, *${n}*! 👋 Qué bueno tenerte por acá. Pregúntame por prendas, tallas, precios o envíos… o mándame una foto 📷 de algo que te guste y te busco lo más parecido.`
      : '¡Hola! 👋 Soy el asistente de *SF Urban*. Pregúntame por prendas, tallas, precios o envíos… o mándame una foto 📷 de algo que te guste y te busco lo más parecido.';
  };

  function render() {
    const box = $('[data-chat-messages]'); if (!box) return;
    box.innerHTML = '';
    box.appendChild(bubble('bot', greeting()));
    log().forEach(m => box.appendChild(bubble(m.role, m.text, '', m.img)));
    $('[data-chat-chips]').hidden = log().length > 0;
    box.scrollTop = box.scrollHeight;
  }

  function wake() {
    if (warmed || !SF.config.agentUrl) return;
    warmed = true;
    fetch(SF.config.agentUrl + '/ping', { mode: 'cors' }).catch(() => { warmed = false; });
  }

  /* ---------- Fotos de referencia ---------- */
  let pending = null; // { full: dataURL para el asistente, thumb: miniatura para el historial }
  async function shrink(file, max, quality) {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(bmp, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  }
  async function pickPhoto(file) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { SF.toast?.('Elige una foto (JPG o PNG)', 'err'); return; }
    try {
      pending = { full: await shrink(file, 900, 0.82), thumb: await shrink(file, 220, 0.7) };
      const pv = $('[data-chat-preview]');
      pv.innerHTML = `<img src="${pending.thumb}" alt="Foto lista para enviar"><span>Foto lista · escribe algo o envíala así</span><button type="button" data-chat-photo-x aria-label="Quitar foto">×</button>`;
      pv.hidden = false; $('[data-chat-input]').focus();
    } catch { SF.toast?.('No pude abrir esa foto 😅 Prueba con otra', 'err'); }
  }
  const clearPhoto = () => { pending = null; const pv = $('[data-chat-preview]'); if (pv) { pv.hidden = true; pv.innerHTML = ''; } const f = $('[data-chat-file]'); if (f) f.value = ''; };

  async function send(text) {
    text = String(text || '').trim();
    const photo = pending;
    if ((!text && !photo) || busy) return;
    if (!text) text = '¿Tienen algo parecido a esta prenda?';
    busy = true;
    clearPhoto();
    const box = $('[data-chat-messages]'), input = $('[data-chat-input]'), btn = $('[data-chat-send]');
    const list = log(); list.push({ role: 'user', text, img: photo?.thumb || null }); save(list);
    $('[data-chat-chips]').hidden = true;
    box.appendChild(bubble('user', text, '', photo?.thumb));
    const typing = bubble('bot', '', 'msg--typing'); typing.innerHTML = '<i></i><i></i><i></i>';
    box.appendChild(typing); box.scrollTop = box.scrollHeight;
    input.value = ''; input.disabled = true; btn.disabled = true;
    // El plan gratis del servidor se "duerme": si tarda, avisamos
    const slow = setTimeout(() => { typing.insertAdjacentHTML('beforeend', '<small>Despertando al asistente… la primera respuesta puede tardar hasta un minuto.</small>'); box.scrollTop = box.scrollHeight; }, 7000);
    SF.track('chat_message', { channel: 'web', photo: photo ? 1 : 0 });

    let answer;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 95000);
      // Datos mínimos: el mensaje, un identificador de conversación, la foto si la mandó
      // y el apodo SOLO si tiene sesión (nunca su nombre completo, correo ni celular)
      const res = await fetch(SF.config.agentUrl + '/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ session: session(), message: text, nickname: SF.auth?.nick?.() || '', image: photo?.full || undefined }),
      });
      clearTimeout(to);
      const data = await res.json().catch(() => ({}));
      answer = data.reply || 'Uy, tuve un problema técnico 🙏 ¿Me escribes de nuevo en un momento?';
    } catch {
      answer = 'No pude conectarme con el asistente 😕 Revisa tu conexión e inténtalo otra vez.';
    }
    clearTimeout(slow);
    typing.remove();
    const l2 = log(); l2.push({ role: 'bot', text: answer }); save(l2);
    box.appendChild(bubble('bot', answer)); box.scrollTop = box.scrollHeight;
    input.disabled = false; btn.disabled = false; input.focus();
    busy = false;
  }

  SF.chat = {
    markup() {
      const hasWa = !!(SF.config.brand.whatsapp || '').replace(/\D/g, '');
      return `
      <div class="chat-panel" data-chat-panel hidden role="dialog" aria-label="Asistente de SF Urban">
        <div class="chat-panel__head">
          <span class="chat-av">${SF.isoSVG}</span>
          <div><strong>Asistente SF Urban</strong><span class="muted">Responde al instante · con IA</span></div>
          <button class="icon-btn" data-chat-reset aria-label="Nueva conversación" title="Nueva conversación"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg></button>
          <button class="icon-btn" data-chat-close aria-label="Cerrar">${icon.close}</button>
        </div>
        ${hasWa ? `<a class="chat-team" href="#" target="_blank" rel="noopener" data-chat-team>
          <span class="chat-team__ic" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91A9.85 9.85 0 0 0 12.04 2Zm4.52 11.98c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.22-.17-.47-.29Z"/></svg></span>
          <span><b>Hablar con el equipo</b><small>Una persona de SF Urban por WhatsApp</small></span>
          <span class="chat-team__go" aria-hidden="true">→</span>
        </a>` : ''}
        <div class="chat-panel__body" data-chat-messages aria-live="polite"></div>
        <div class="chips chat-chips" data-chat-chips>
          <button data-chat-photo-pick>📷 Buscar por foto</button>
          <button data-chat-q="¿Qué tienen disponible?">¿Qué tienen disponible?</button>
          <button data-chat-q="¿Cómo sé mi talla?">¿Cómo sé mi talla?</button>
          <button data-chat-q="¿Cuánto cuesta el envío?">Envíos</button>
        </div>
        <div class="chat-preview" data-chat-preview hidden></div>
        <form class="chat-panel__form" data-chat-form>
          <button type="button" class="chat-attach" data-chat-photo-pick aria-label="Enviar una foto de referencia" title="Enviar una foto de referencia"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg></button>
          <input type="file" accept="image/*" data-chat-file hidden>
          <input data-chat-input type="text" maxlength="800" placeholder="Escribe o manda una foto…" aria-label="Mensaje" autocomplete="off">
          <button class="chat-send" data-chat-send aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4 10 14M21 4l-6.5 16-3.5-6.5L4.5 10z"/></svg></button>
        </form>
        <p class="chat-legal">Asistente automático con IA (Claude, de Anthropic). Tus mensajes y fotos se procesan solo para responderte; no compartas datos sensibles ni de pago. <a href="${SF.config.legal.docs.privacidad}#chat" target="_blank" rel="noopener">Privacidad</a></p>
      </div>`;
    },
    open() { const p = $('[data-chat-panel]'); if (!p) return; p.hidden = false; render(); wake(); setTimeout(() => $('[data-chat-input]')?.focus(), 50); SF.track('chat_open'); },
    close() { const p = $('[data-chat-panel]'); if (p) p.hidden = true; },
    toggle() { const p = $('[data-chat-panel]'); p && p.hidden ? SF.chat.open() : SF.chat.close(); },
    bind() {
      document.addEventListener('submit', (e) => { if (e.target.matches('[data-chat-form]')) { e.preventDefault(); send($('[data-chat-input]').value); } });
      document.addEventListener('click', (e) => {
        const q = e.target.closest('[data-chat-q]'); if (q) send(q.dataset.chatQ);
        if (e.target.closest('[data-chat-reset]')) { SF.db.kv.del(KEY_LOG); SF.db.kv.del(KEY_SESSION); clearPhoto(); render(); }
        if (e.target.closest('[data-chat-photo-pick]')) $('[data-chat-file]')?.click();
        if (e.target.closest('[data-chat-photo-x]')) clearPhoto();
        // "Hablar con el equipo": abre WhatsApp con un mensaje listo (con su apodo si tiene sesión)
        const team = e.target.closest('[data-chat-team]');
        if (team) {
          const n = SF.auth?.nick?.() || '';
          team.href = SF.whatsappUrl?.(`Hola SF Urban 👋${n ? ` Soy ${n}.` : ''} Vengo del chat de la tienda y quiero hablar con alguien del equipo.`) || '#';
          SF.track('whatsapp_click', { from: 'chat' });
        }
      });
      document.addEventListener('change', (e) => { if (e.target.matches('[data-chat-file]')) pickPhoto(e.target.files[0]); });
      // Re-saludar con el apodo si inicia o cierra sesión con el chat abierto
      SF.auth?.onChange?.(() => { const p = $('[data-chat-panel]'); if (p && !p.hidden) render(); });
    },
  };
})();
