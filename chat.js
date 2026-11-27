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

  function bubble(role, text, extraClass = '') {
    const div = document.createElement('div');
    div.className = `msg msg--${role} ${extraClass}`;
    div.innerHTML = role === 'bot' ? format(text) : esc(text).replace(/\n/g, '<br>');
    return div;
  }

  function render() {
    const box = $('[data-chat-messages]'); if (!box) return;
    box.innerHTML = '';
    box.appendChild(bubble('bot', '¡Hola! 👋 Soy el asistente de *SF Urban*. Pregúntame por prendas, tallas, precios o envíos.'));
    log().forEach(m => box.appendChild(bubble(m.role, m.text)));
    $('[data-chat-chips]').hidden = log().length > 0;
    box.scrollTop = box.scrollHeight;
  }

  function wake() {
    if (warmed || !SF.config.agentUrl) return;
    warmed = true;
    fetch(SF.config.agentUrl + '/ping', { mode: 'cors' }).catch(() => { warmed = false; });
  }

  async function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    busy = true;
    const box = $('[data-chat-messages]'), input = $('[data-chat-input]'), btn = $('[data-chat-send]');
    const list = log(); list.push({ role: 'user', text }); save(list);
    $('[data-chat-chips]').hidden = true;
    box.appendChild(bubble('user', text));
    const typing = bubble('bot', '', 'msg--typing'); typing.innerHTML = '<i></i><i></i><i></i>';
    box.appendChild(typing); box.scrollTop = box.scrollHeight;
    input.value = ''; input.disabled = true; btn.disabled = true;
    // El plan gratis del servidor se "duerme": si tarda, avisamos
    const slow = setTimeout(() => { typing.insertAdjacentHTML('beforeend', '<small>Despertando al asistente… la primera respuesta puede tardar hasta un minuto.</small>'); box.scrollTop = box.scrollHeight; }, 7000);
    SF.track('chat_message', { channel: 'web' });

    let answer;
    try {
      const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 95000);
      const u = SF.auth.user();
      const res = await fetch(SF.config.agentUrl + '/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ session: session(), message: text, name: u ? u.name : '' }),
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
      const wa = (SF.config.brand.whatsapp || '').replace(/\D/g, '');
      return `
      <div class="chat-panel" data-chat-panel hidden role="dialog" aria-label="Asistente de SF Urban">
        <div class="chat-panel__head">
          <span class="chat-av">${SF.isoSVG}</span>
          <div><strong>Asistente SF Urban</strong><span class="muted">Responde al instante · con IA</span></div>
          <button class="icon-btn" data-chat-reset aria-label="Nueva conversación" title="Nueva conversación"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5"/></svg></button>
          <button class="icon-btn" data-chat-close aria-label="Cerrar">${icon.close}</button>
        </div>
        <div class="chat-panel__body" data-chat-messages aria-live="polite"></div>
        <div class="chips chat-chips" data-chat-chips>
          <button data-chat-q="¿Qué tienen disponible?">¿Qué tienen disponible?</button>
          <button data-chat-q="¿Cómo sé mi talla?">¿Cómo sé mi talla?</button>
          <button data-chat-q="¿Cuánto cuesta el envío?">Envíos</button>
        </div>
        <form class="chat-panel__form" data-chat-form>
          <input data-chat-input type="text" maxlength="800" placeholder="Escribe tu pregunta…" aria-label="Mensaje" autocomplete="off">
          <button class="chat-send" data-chat-send aria-label="Enviar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 4 10 14M21 4l-6.5 16-3.5-6.5L4.5 10z"/></svg></button>
        </form>
        ${wa ? `<a class="chat-wa" href="https://wa.me/${wa}?text=${encodeURIComponent('Hola SF Urban 👋')}" target="_blank" rel="noopener">${icon.chat} Hablar por WhatsApp con una persona</a>` : ''}
      </div>`;
    },
    open() { const p = $('[data-chat-panel]'); if (!p) return; p.hidden = false; render(); wake(); setTimeout(() => $('[data-chat-input]')?.focus(), 50); SF.track('chat_open'); },
    close() { const p = $('[data-chat-panel]'); if (p) p.hidden = true; },
    toggle() { const p = $('[data-chat-panel]'); p && p.hidden ? SF.chat.open() : SF.chat.close(); },
    bind() {
      document.addEventListener('submit', (e) => { if (e.target.matches('[data-chat-form]')) { e.preventDefault(); send($('[data-chat-input]').value); } });
      document.addEventListener('click', (e) => {
        const q = e.target.closest('[data-chat-q]'); if (q) send(q.dataset.chatQ);
        if (e.target.closest('[data-chat-reset]')) { SF.db.kv.del(KEY_LOG); SF.db.kv.del(KEY_SESSION); render(); }
      });
    },
  };
})();
