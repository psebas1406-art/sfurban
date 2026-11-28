/* =========================================================
   Consentimientos (Ley 1581 de 2012 · Decreto 1377 de 2013)
   - Cada aceptación/retiro se guarda con: quién, qué documento y
     versión, el texto exacto mostrado, cómo, dónde y cuándo.
   - Se envía al servidor (que agrega su hora oficial y la IP) para
     que SF Urban conserve la PRUEBA. Además queda una copia en el
     navegador para que la persona pueda verla en su perfil.
   - Si el servidor no responde, se reintenta en la próxima visita.
   ========================================================= */
(function () {
  const KEY = 'consents', ANON = 'anonId', COOKIE_PREF = 'cookiePrefs';
  const L = SF.config.legal;

  const anonId = () => {
    let a = SF.db.kv.get(ANON);
    if (!a) { a = (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 12)); SF.db.kv.set(ANON, a); }
    return a;
  };
  const docUrl = (doc) => new URL(L.docs[doc], location.href.split('#')[0]).href;

  // Textos EXACTOS que se muestran junto a cada casilla (se guardan tal cual en el registro)
  const TEXTS = {
    terminos: 'He leído y acepto los Términos y condiciones.',
    privacidad: 'Autorizo el tratamiento de mis datos personales según la Política de privacidad.',
    marketing: 'Quiero recibir novedades, lanzamientos y descuentos por correo (opcional).',
    mayoria_edad: 'Confirmo que soy mayor de 18 años.',
    cookies_analitica: 'Acepto cookies y almacenamiento de analítica para mejorar la tienda.',
    whatsapp: 'Quiero recibir avisos y descuentos por WhatsApp (Black Friday, lanzamientos, promociones) (opcional).',
  };
  const DOC_FOR = { terminos: 'terminos', privacidad: 'privacidad', marketing: 'privacidad', whatsapp: 'privacidad', mayoria_edad: 'terminos', cookies_analitica: 'cookies' };

  async function push(payload) {
    if (!SF.config.agentUrl) return false;
    try {
      const res = await fetch(SF.config.agentUrl + '/consent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      return res.ok && data.ok ? data : false;
    } catch { return false; }
  }

  SF.consent = {
    TEXTS,
    anonId,

    /** Registra uno o varios consentimientos de un mismo formulario.
        items: [{ purpose, granted }] · form: 'registro' | 'checkout' | 'banner-cookies' | 'perfil' */
    async record({ items, form, method = 'casilla no premarcada', email = null, userId = null }) {
      const clientTs = new Date().toISOString();
      const payload = {
        subject: { anonId: anonId(), userId, email },
        items: items.map(i => ({ purpose: i.purpose, granted: !!i.granted, docVersion: L.versions[DOC_FOR[i.purpose]], docUrl: docUrl(DOC_FOR[i.purpose]), textShown: TEXTS[i.purpose] })),
        method, form, pageUrl: location.href.split('#')[0], clientTs,
      };
      const local = SF.db.kv.get(KEY, []);
      const entry = { payload, synced: false };
      local.push(entry); SF.db.kv.set(KEY, local);
      const ok = await push(payload);
      if (ok) { entry.synced = true; entry.serverTs = ok.saved?.[0]?.server_ts; SF.db.kv.set(KEY, local); }
      return !!ok;
    },

    /** Reintenta enviar lo que no llegó al servidor (p. ej. sin internet). */
    async flush() {
      const local = SF.db.kv.get(KEY, []); let changed = false;
      for (const e of local) if (!e.synced) { const ok = await push(e.payload); if (ok) { e.synced = true; e.serverTs = ok.saved?.[0]?.server_ts; changed = true; } }
      if (changed) SF.db.kv.set(KEY, local);
    },

    /** Historial de esta persona (para mostrar en el perfil). */
    history(email) {
      return SF.db.kv.get(KEY, [])
        .filter(e => !email || !e.payload.subject.email || e.payload.subject.email === email)
        .flatMap(e => e.payload.items.map(i => ({ ...i, form: e.payload.form, method: e.payload.method, at: e.serverTs || e.payload.clientTs, synced: e.synced })))
        .reverse();
    },

    /* ---------- Preferencias de cookies / almacenamiento ---------- */
    cookies: {
      get: () => SF.db.kv.get(COOKIE_PREF, null),        // null = aún no decide
      analytics: () => !!(SF.db.kv.get(COOKIE_PREF, null) || {}).analytics,
      async set(analytics, method) {
        const prev = SF.db.kv.get(COOKIE_PREF, null);
        SF.db.kv.set(COOKIE_PREF, { analytics: !!analytics, at: new Date().toISOString(), version: L.versions.cookies });
        if (!analytics) SF.db.kv.set('events', []);      // al rechazar/retirar, se borra lo ya medido
        if (!prev || prev.analytics !== !!analytics) {
          const u = SF.auth && SF.auth.user();
          await SF.consent.record({ items: [{ purpose: 'cookies_analitica', granted: !!analytics }], form: 'banner-cookies', method, email: u?.email || null, userId: u?.id || null });
        }
      },
    },

    /** HTML de una casilla legal (siempre sin marcar) con enlace al documento. */
    checkbox(purpose, { required = true, linkText, doc } = {}) {
      const d = doc || DOC_FOR[purpose];
      const text = TEXTS[purpose];
      const link = linkText ? text.replace(linkText, `<a href="${L.docs[d]}" target="_blank" rel="noopener">${linkText}</a>`) : SF.esc(text);
      return `<label class="check check--legal"><input type="checkbox" name="c_${purpose}" ${required ? 'required' : ''}> <span>${link}${required ? '' : ''}</span></label>`;
    },
  };
})();
