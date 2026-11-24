/* =========================================================
   Autenticación (modo demo local).
   Contraseñas con hash SHA-256 + sal (nunca en texto plano).
   AVISO: en producción la autenticación DEBE hacerse en el servidor
   (Supabase Auth / Firebase Auth / backend propio). Este módulo
   expone la misma interfaz para que el resto del sitio no cambie.
   ========================================================= */
(function () {
  const enc = new TextEncoder();
  async function hash(pass, salt) {
    const buf = await crypto.subtle.digest('SHA-256', enc.encode(salt + ':' + pass));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const emailOk = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
  const listeners = new Set();
  const emit = () => listeners.forEach(fn => fn(SF.auth.user()));

  SF.auth = {
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    user() {
      const s = SF.db.kv.get('session');
      if (!s) return null;
      const u = SF.db.get('users', s.userId);
      if (!u) return null;
      const { passHash, salt, ...safe } = u; return safe;
    },

    async register({ name, email, password, phone = '', birthdate = '', marketing = false }) {
      name = (name || '').trim(); email = (email || '').trim().toLowerCase();
      if (name.length < 2) throw new Error('Escribe tu nombre.');
      if (!emailOk(email)) throw new Error('Ese correo no parece válido.');
      if ((password || '').length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      if (SF.db.where('users', u => u.email === email).length) throw new Error('Ya existe una cuenta con ese correo. Inicia sesión.');
      const salt = crypto.getRandomValues(new Uint32Array(2)).join('-');
      const user = SF.db.insert('users', { name, email, phone, birthdate, marketing, salt, passHash: await hash(password, salt), role: 'customer' });
      SF.db.kv.set('session', { userId: user.id, at: Date.now() });
      SF.cart.mergeGuest();
      SF.track('sign_up', { method: 'email' });
      emit(); return SF.auth.user();
    },

    async login({ email, password }) {
      email = (email || '').trim().toLowerCase();
      const u = SF.db.where('users', x => x.email === email)[0];
      if (!u || (await hash(password || '', u.salt)) !== u.passHash) throw new Error('Correo o contraseña incorrectos.');
      SF.db.kv.set('session', { userId: u.id, at: Date.now() });
      SF.cart.mergeGuest();
      SF.track('login');
      emit(); return SF.auth.user();
    },

    logout() { SF.db.kv.del('session'); SF.track('logout'); emit(); },

    updateProfile(patch) {
      const u = SF.auth.user(); if (!u) return null;
      const allowed = ['name', 'phone', 'birthdate', 'marketing', 'address'];
      const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
      SF.db.update('users', u.id, clean); emit(); return SF.auth.user();
    },

    // Demo: en producción se envía un correo con enlace seguro.
    async requestReset(email) {
      if (!emailOk((email || '').trim())) throw new Error('Escribe un correo válido.');
      SF.track('password_reset_requested');
      return true;
    },
  };
})();
